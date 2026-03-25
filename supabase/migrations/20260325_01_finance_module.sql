-- ============================================================
-- Finance Module — Bank Transactions + P&L
-- ============================================================

-- 1. bank_accounts
CREATE TABLE public.bank_accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank          text NOT NULL CHECK (bank IN ('leumi', 'hapoalim', 'mizrahi')),
  account_number text NOT NULL,           -- e.g. "827-192600/41"
  display_name  text NOT NULL,
  currency      text NOT NULL DEFAULT 'ILS',
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uidx_bank_accounts_unique
  ON public.bank_accounts(company_id, bank, account_number);

CREATE INDEX idx_bank_accounts_company ON public.bank_accounts(company_id);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_bank_accounts" ON public.bank_accounts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. bank_uploaded_files
CREATE TABLE public.bank_uploaded_files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  file_name     text NOT NULL,
  file_format   text NOT NULL CHECK (file_format IN ('leumi_csv', 'hapoalim_xlsx', 'mizrahi_xls')),
  date_from     date,
  date_to       date,
  row_count     integer,
  uploaded_by   uuid REFERENCES auth.users(id),
  uploaded_at   timestamptz NOT NULL DEFAULT now(),
  notes         text
);

CREATE INDEX idx_bank_uploaded_files_company ON public.bank_uploaded_files(company_id);
CREATE INDEX idx_bank_uploaded_files_account ON public.bank_uploaded_files(bank_account_id);

ALTER TABLE public.bank_uploaded_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_bank_uploaded_files" ON public.bank_uploaded_files
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. bank_transactions
CREATE TABLE public.bank_transactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id   uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  uploaded_file_id  uuid REFERENCES public.bank_uploaded_files(id) ON DELETE SET NULL,

  -- core fields (normalized across all banks)
  date              date NOT NULL,
  description       text NOT NULL DEFAULT '',
  details           text NOT NULL DEFAULT '',
  reference         text NOT NULL DEFAULT '',
  debit             numeric(14,2) NOT NULL DEFAULT 0,
  credit            numeric(14,2) NOT NULL DEFAULT 0,
  balance           numeric(14,2),

  -- bank-specific fields
  operation_code    text,     -- hapoalim only
  batch_code        text,     -- hapoalim only (צרור)
  notes             text,

  -- classification
  category_id       uuid,     -- FK added later when bank_categories exists
  category_override text,

  -- source info
  source_bank       text NOT NULL CHECK (source_bank IN ('leumi', 'hapoalim', 'mizrahi')),
  raw_row           jsonb,

  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_transactions_company ON public.bank_transactions(company_id);
CREATE INDEX idx_bank_transactions_account ON public.bank_transactions(bank_account_id);
CREATE INDEX idx_bank_transactions_date    ON public.bank_transactions(date);

-- dedup: prevent duplicate rows from re-uploading the same file
CREATE UNIQUE INDEX uidx_bank_transactions_dedup
  ON public.bank_transactions(bank_account_id, date, reference, debit, credit)
  WHERE reference <> '';

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_bank_transactions" ON public.bank_transactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. bank_categories
CREATE TABLE public.bank_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'ignore')),
  color       text,
  icon        text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_categories_company ON public.bank_categories(company_id);

ALTER TABLE public.bank_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_bank_categories" ON public.bank_categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add FK from bank_transactions to bank_categories
ALTER TABLE public.bank_transactions
  ADD CONSTRAINT fk_bank_transactions_category
  FOREIGN KEY (category_id) REFERENCES public.bank_categories(id) ON DELETE SET NULL;

-- 5. category_rules (auto-classification rules)
CREATE TABLE public.category_rules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category_id   uuid NOT NULL REFERENCES public.bank_categories(id) ON DELETE CASCADE,
  match_field   text NOT NULL CHECK (match_field IN ('description', 'details', 'reference', 'operation_code')),
  match_type    text NOT NULL CHECK (match_type IN ('contains', 'starts_with', 'exact', 'regex')),
  match_value   text NOT NULL,
  priority      integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_category_rules_company  ON public.category_rules(company_id);
CREATE INDEX idx_category_rules_category ON public.category_rules(category_id);

ALTER TABLE public.category_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_category_rules" ON public.category_rules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. transaction_detail_documents
CREATE TABLE public.transaction_detail_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_name     text NOT NULL,
  doc_type      text NOT NULL CHECK (doc_type IN ('salary_xlsx', 'credit_card_xlsx', 'transfers_pdf', 'leumi_credit_xls', 'other')),
  doc_date      date,
  total_amount  numeric(14,2),
  reference     text,             -- אסמכתא (key matching field)
  uploaded_by   uuid REFERENCES auth.users(id),
  uploaded_at   timestamptz NOT NULL DEFAULT now(),
  raw_data      jsonb,            -- parsed content stored here
  notes         text
);

CREATE INDEX idx_detail_documents_company ON public.transaction_detail_documents(company_id);
CREATE INDEX idx_detail_documents_date    ON public.transaction_detail_documents(doc_date);

ALTER TABLE public.transaction_detail_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_transaction_detail_documents" ON public.transaction_detail_documents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. transaction_document_links  (transactions ↔ documents)
CREATE TABLE public.transaction_document_links (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  uuid NOT NULL REFERENCES public.bank_transactions(id) ON DELETE CASCADE,
  document_id     uuid NOT NULL REFERENCES public.transaction_detail_documents(id) ON DELETE CASCADE,
  match_method    text NOT NULL CHECK (match_method IN ('manual', 'auto_reference', 'auto_date_amount')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (transaction_id, document_id)
);

CREATE INDEX idx_doc_links_transaction ON public.transaction_document_links(transaction_id);
CREATE INDEX idx_doc_links_document    ON public.transaction_document_links(document_id);

ALTER TABLE public.transaction_document_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_transaction_document_links" ON public.transaction_document_links
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. transaction_detail_items  (individual rows inside a document)
CREATE TABLE public.transaction_detail_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  uuid NOT NULL REFERENCES public.transaction_detail_documents(id) ON DELETE CASCADE,
  row_index    integer NOT NULL,
  payee_name   text,
  payee_id     text,             -- ת.ז / מספר מזהה
  bank         text,
  branch       text,
  account      text,
  amount       numeric(14,2),
  description  text,
  extra        jsonb,            -- any additional fields per doc type
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_detail_items_document ON public.transaction_detail_items(document_id);

ALTER TABLE public.transaction_detail_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_transaction_detail_items" ON public.transaction_detail_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
