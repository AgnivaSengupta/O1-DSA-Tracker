'use server';
import { db } from '@/lib/db';
import { solvedProblems } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

async function getAuthUserId(): Promise<string> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }
  return session.user.id;
}

export async function getSolvedProblems(): Promise<string[]> {
  try {
    const userId = await getAuthUserId();
    const records = await db
      .select({ problemId: solvedProblems.problemId })
      .from(solvedProblems)
      .where(eq(solvedProblems.userId, userId));
    return records.map((r) => r.problemId);
  } catch (error) {
    console.error('Failed to fetch solved problems:', error);
    return [];
  }
}

export async function toggleProblemSolved(
  problemId: string
): Promise<{ solved: boolean }> {
  try {
    const userId = await getAuthUserId();
    const existing = await db
      .select()
      .from(solvedProblems)
      .where(
        and(
          eq(solvedProblems.problemId, problemId),
          eq(solvedProblems.userId, userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .delete(solvedProblems)
        .where(
          and(
            eq(solvedProblems.problemId, problemId),
            eq(solvedProblems.userId, userId)
          )
        );
      return { solved: false };
    } else {
      await db.insert(solvedProblems).values({
        problemId,
        userId,
      });
      return { solved: true };
    }
  } catch (error) {
    console.error('Failed to toggle problem:', error);
    throw new Error('Database operation failed');
  }
}
