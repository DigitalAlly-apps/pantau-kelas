import { describe, it, expect } from 'vitest';
import type { Student, Kelas } from '@/types';

// Helper function mirroring AppContext logic for test verification
function insertStudents(
  currentStudents: Student[],
  newStudentsData: { name: string; nis: string }[],
  kelasId: string,
  targetPosition?: number
): Student[] {
  const newStudents = newStudentsData.map((s, i) => ({
    id: `${kelasId}_test_${i}`,
    name: s.name.trim(),
    nis: s.nis.trim(),
  })).filter(s => s.name);

  if (newStudents.length === 0) return currentStudents;

  const nextStudents = [...currentStudents];
  if (
    typeof targetPosition === 'number' &&
    Number.isInteger(targetPosition) &&
    targetPosition >= 1 &&
    targetPosition <= nextStudents.length + 1
  ) {
    nextStudents.splice(targetPosition - 1, 0, ...newStudents);
  } else {
    nextStudents.push(...newStudents);
  }
  return nextStudents;
}

function reorderStudent(
  currentStudents: Student[],
  studentId: string,
  targetPosition: number
): Student[] {
  const currentIndex = currentStudents.findIndex(s => s.id === studentId);
  if (currentIndex === -1) return currentStudents;

  const targetIdx = Math.max(0, Math.min(currentStudents.length - 1, targetPosition - 1));
  if (currentIndex === targetIdx) return currentStudents;

  const nextStudents = [...currentStudents];
  const [moved] = nextStudents.splice(currentIndex, 1);
  nextStudents.splice(targetIdx, 0, moved);
  return nextStudents;
}

function updateStudentData(
  currentStudents: Student[],
  studentId: string,
  updates: { name?: string; nis?: string }
): Student[] {
  return currentStudents.map(s =>
    s.id !== studentId ? s : { ...s, ...updates }
  );
}

describe('Student Attendance Ordering & Positioning', () => {
  const initialStudents: Student[] = [
    { id: 's1', name: 'Budi Santoso', nis: '1001' },
    { id: 's2', name: 'Citra Lestari', nis: '1002' },
    { id: 's3', name: 'Dewi Anggraini', nis: '1003' },
  ];

  it('appends new student at the end by default without shifting existing numbers', () => {
    // New student "Ahmad" (alphabetically first, but joined late)
    const result = insertStudents(initialStudents, [{ name: 'Ahmad Late', nis: '1004' }], 'k1');

    expect(result).toHaveLength(4);
    // Budi stays No. 1, Citra No. 2, Dewi No. 3
    expect(result[0].name).toBe('Budi Santoso');
    expect(result[1].name).toBe('Citra Lestari');
    expect(result[2].name).toBe('Dewi Anggraini');
    // Ahmad is placed at No. 4 (last position)
    expect(result[3].name).toBe('Ahmad Late');
  });

  it('inserts new student at specific custom position (e.g. No. 2) shifting subsequent students down', () => {
    const result = insertStudents(initialStudents, [{ name: 'Bambang Baru', nis: '1005' }], 'k1', 2);

    expect(result).toHaveLength(4);
    // Budi remains No. 1
    expect(result[0].name).toBe('Budi Santoso');
    // Bambang is inserted at No. 2
    expect(result[1].name).toBe('Bambang Baru');
    // Citra shifts from No. 2 to No. 3
    expect(result[2].name).toBe('Citra Lestari');
    // Dewi shifts from No. 3 to No. 4
    expect(result[3].name).toBe('Dewi Anggraini');
  });

  it('inserts new student at position 1 (top of list)', () => {
    const result = insertStudents(initialStudents, [{ name: 'Anwar', nis: '1006' }], 'k1', 1);

    expect(result).toHaveLength(4);
    expect(result[0].name).toBe('Anwar');
    expect(result[1].name).toBe('Budi Santoso');
    expect(result[2].name).toBe('Citra Lestari');
    expect(result[3].name).toBe('Dewi Anggraini');
  });

  it('reorders an existing student from last to first position', () => {
    // Move Dewi (currently No. 3 / index 2) to No. 1 (targetPosition: 1)
    const result = reorderStudent(initialStudents, 's3', 1);

    expect(result.map(s => s.name)).toEqual([
      'Dewi Anggraini', // now No. 1
      'Budi Santoso',   // shifted to No. 2
      'Citra Lestari',  // shifted to No. 3
    ]);
  });

  it('reorders an existing student from first to last position', () => {
    // Move Budi (currently No. 1 / index 0) to No. 3 (targetPosition: 3)
    const result = reorderStudent(initialStudents, 's1', 3);

    expect(result.map(s => s.name)).toEqual([
      'Citra Lestari',  // shifted to No. 1
      'Dewi Anggraini', // shifted to No. 2
      'Budi Santoso',   // now No. 3
    ]);
  });

  it('updating student name does NOT reshuffle or sort the class array', () => {
    // Suppose class order is [Budi, Citra, Dewi]
    // Teacher fixes typo: "Budi Santoso" -> "Zaki Santoso"
    // Previously this would have jumped to the end of the list due to localeCompare
    const result = updateStudentData(initialStudents, 's1', { name: 'Zaki Santoso' });

    expect(result[0].id).toBe('s1');
    expect(result[0].name).toBe('Zaki Santoso');
    expect(result[1].name).toBe('Citra Lestari');
    expect(result[2].name).toBe('Dewi Anggraini');
  });
});
