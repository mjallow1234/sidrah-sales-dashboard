export const CRM_LEAD_STATUSES = ['new', 'follow_up_required', 'converted', 'not_interested', 'lost'] as const;
export type CrmLeadStatus = typeof CRM_LEAD_STATUSES[number];
export type CrmLeadActivityType = 'created' | 'note' | 'status_change' | 'follow_up';

export interface CrmLead {
  lead_id: string;
  lead_name: string;
  phone?: string | null;
  location?: string | null;
  business_type?: string | null;
  lead_source?: string | null;
  assigned_agent_user_id?: string | null;
  assigned_agent_name?: string | null;
  captured_by_user_id: string;
  captured_by_name?: string | null;
  captured_at: string;
  status: CrmLeadStatus;
  notes?: string | null;
  next_follow_up_date?: string | null;
  created_at: string;
  updated_at: string;
  updated_by_user_id: string;
  updated_by_name?: string | null;
}

export interface CrmLeadActivity {
  activity_id: string;
  lead_id: string;
  activity_type: CrmLeadActivityType;
  activity_at: string;
  actor_user_id: string;
  actor_name?: string | null;
  note?: string | null;
  previous_status?: CrmLeadStatus | null;
  new_status?: CrmLeadStatus | null;
  follow_up_date?: string | null;
}

export interface CrmLeadFilters {
  status?: CrmLeadStatus;
  assignedAgentUserId?: string;
  search?: string;
  businessType?: string;
  location?: string;
  capturedFrom?: string;
  capturedTo?: string;
  followUpDate?: string;
  followUpBucket?: 'overdue' | 'today' | 'upcoming';
}

export interface CrmLeadSummary {
  follow_up_today: number;
  overdue_follow_ups: number;
  upcoming_follow_ups: number;
  new_leads: number;
  converted_leads: number;
  lost_leads: number;
}
