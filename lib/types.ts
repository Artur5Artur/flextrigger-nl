export type CompanyRecord = {
  id: string;
  name: string;
  website: string | null;
  city: string | null;
  created_at: string;
};

export type LeadEmailStatus = "sent" | "delivered" | "opened" | null;

export type DashboardLead = {
  id: string;
  contact_person: string | null;
  contact_email: string | null;
  ai_pitch: string | null;
  status: string;
  email_status: LeadEmailStatus;
  created_at: string;
  vacancy: {
    id: string;
    title: string;
    source_url: string;
    location: string | null;
    status: string;
    company: {
      name: string;
      city: string | null;
      website: string | null;
    } | null;
  } | null;
};

export type PilotRequest = {
  id: string;
  agency_name: string;
  contact_name: string;
  email: string;
  city: string | null;
  created_at: string;
};

export type DashboardPayload = {
  configured: boolean;
  leads: DashboardLead[];
  companies: CompanyRecord[];
  pilotRequests?: PilotRequest[];
  error?: string;
};

export type ParsedVacancy = {
  title: string;
  companyName: string;
  location: string;
  city: string;
  sourceUrl: string;
  description: string;
  contactEmail: string | null;
  website: string | null;
};
