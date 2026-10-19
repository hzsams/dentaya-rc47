-- DentAYA MVP v6 Step 4B — Validation hardening
-- Canlı Supabase projesine uygulanmıştır.

alter table public.organization_messages
  add constraint organization_messages_body_check
  check (char_length(btrim(body)) between 1 and 4000);

alter table public.clinic_case_finance
  add constraint clinic_case_finance_discount_le_price_check
  check (discount_amount <= patient_price);

alter table public.clinic_case_finance
  add constraint clinic_case_finance_paid_le_net_check
  check (paid_amount <= greatest(patient_price - discount_amount, 0));

alter table public.lab_case_quotes
  add constraint lab_case_quotes_sent_positive_check
  check (status <> 'sent' or amount > 0);
