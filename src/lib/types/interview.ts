/** 面談記録 */
export interface InterviewNote {
  noteId: string;
  employeeId: string;
  storeId: string;
  date: string; // YYYY-MM-DD
  interviewer: string;
  situation: string; // 現状
  issue: string; // 課題
  action: string; // アクション
  employeeComment: string; // 本人コメント
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface InterviewNotesData {
  version: number;
  notes: InterviewNote[];
}
