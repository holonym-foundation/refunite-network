export type Invite = {
  id: string;
  inviter_address: string;
  signature_nonce: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
};

export type Database = {
  public: {
    Tables: {
      invites: {
        Row: Invite;
        Insert: Omit<Invite, "id" | "created_at" | "used_at" | "used_by">;
        Update: Partial<Omit<Invite, "id" | "created_at">>;
      };
    };
  };
};
