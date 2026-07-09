import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function flagEmailDuplicate(studentId: string, email: string) {
  const normalized = email.toLowerCase().trim();
  const matches = await prisma.student.findMany({
    where: {
      id: { not: studentId },
      email: { equals: normalized, mode: "insensitive" },
      isActive: true,
    },
    include: { leads: { where: { isCurrent: true }, take: 1, select: { assignedToId: true } } },
    take: 5,
  });

  for (const match of matches) {
    const [aId, bId] = studentId < match.id ? [studentId, match.id] : [match.id, studentId];
    await prisma.studentDuplicateFlag.upsert({
      where: { studentAId_studentBId: { studentAId: aId, studentBId: bId } },
      create: { studentAId: aId, studentBId: bId, reason: "EMAIL_MATCH" },
      update: {},
    });

    if (match.leads[0]?.assignedToId) {
      await createNotification({
        userId: match.leads[0].assignedToId,
        type: "POSSIBLE_DUPLICATE",
        title: "Possible Duplicate Student",
        message: `Email match flagged between students — review in Admin > Duplicates`,
        resourceId: aId,
      });
    }
  }
}

export async function flagMobileCollision(studentAId: string, studentBId: string) {
  const [aId, bId] = studentAId < studentBId ? [studentAId, studentBId] : [studentBId, studentAId];
  await prisma.studentDuplicateFlag.upsert({
    where: { studentAId_studentBId: { studentAId: aId, studentBId: bId } },
    create: { studentAId: aId, studentBId: bId, reason: "MOBILE_COLLISION" },
    update: {},
  });
}
