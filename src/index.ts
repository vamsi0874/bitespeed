import express from "express";

import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
app.use(express.json());

app.post("/identify", async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({ error: "Email or phoneNumber required" });
    }

    const contacts = await prisma.contact.findMany({
      where: {
        OR: [
          { email: email || undefined },
          { phoneNumber: phoneNumber || undefined }
        ]
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    let primaryContact = contacts.find((c) => c.linkPrecedence === "primary");

    if (!primaryContact) {
  
      const newContact = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "primary"
        }
      });

      return res.json({
        contact: {
          primaryContactId: newContact.id,
          emails: [newContact.email].filter(Boolean),
          phoneNumbers: [newContact.phoneNumber].filter(Boolean),
          secondaryContactIds: []
        }
      });
    }

    let secondaryContact = contacts.find(
      (c) => c.linkPrecedence === "secondary" && c.linkedId === primaryContact?.id
    );

  
    if (
      !contacts.some((c) => c.email === email && c.phoneNumber === phoneNumber)
    ) {
      const newSecondary = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "secondary",
          linkedId: primaryContact.id
        }
      });
      contacts.push(newSecondary);
    }

    const emails = Array.from(new Set(contacts.map((c) => c.email).filter(Boolean)));
    const phoneNumbers = Array.from(new Set(contacts.map((c) => c.phoneNumber).filter(Boolean)));
    const secondaryIds = contacts
      .filter((c) => c.linkPrecedence === "secondary")
      .map((c) => c.id);

    res.json({
      contact: {
        primaryContactId: primaryContact.id,
        emails,
        phoneNumbers,
        secondaryContactIds: secondaryIds
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
