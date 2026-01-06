-- Add Yurtiçi COD / report debug fields to orders table
alter table public.orders
  add column if not exists yurtici_cod_doc_id text null,
  add column if not exists yurtici_cod_doc_type text null,
  add column if not exists yurtici_cod_confirmed boolean not null default false,
  add column if not exists yurtici_report_document_types text[] null,
  add column if not exists yurtici_tt_collection_type text null,
  add column if not exists yurtici_tt_document_id text null,
  add column if not exists yurtici_tt_invoice_amount numeric null,
  add column if not exists yurtici_tt_document_save_type text null,
  add column if not exists yurtici_dc_credit_rule text null,
  add column if not exists yurtici_dc_selected_credit text null,
  add column if not exists yurtici_job_id bigint null,
  add column if not exists yurtici_create_out_flag text null,
  add column if not exists yurtici_create_out_result text null,
  add column if not exists yurtici_create_err_code text null,
  add column if not exists yurtici_create_err_message text null;

