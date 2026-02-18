/**
 * Feedback-related types shared between client and server
 */

export interface FeedbackLog {
  log_id: number;
  log_icafe_id: number;
  log_date: string;
  log_member_account: string;
  log_pc_name: string;
  log_event: string;
  log_date_local: string;
  subject: string;
  message: string;
  log_money?: string;
  log_spend?: string;
  log_card?: string;
  log_bonus?: string;
  log_coin?: string;
  log_used_secs?: number;
  log_staff_name?: string;
}

export interface CafeFeedbacks {
  cafeDbId: number;
  cafeName: string;
  cafeId: string;
  feedbacks: FeedbackLog[];
}
