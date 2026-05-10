-- ============================================
-- 知识图谱项目 - Supabase 数据库初始化脚本
-- ============================================

-- 开启 pgvector 扩展（用于后续向量相似度计算）
create extension if not exists vector;

-- --------------------------------------------
-- 表：documents（上传的教材文档）
-- --------------------------------------------
create table documents (
  id          uuid primary key default gen_random_uuid(),
  filename    text    not null,
  upload_time timestamp with time zone default now()
);

-- --------------------------------------------
-- 表：nodes（知识节点）
-- --------------------------------------------
create table nodes (
  id          uuid primary key default gen_random_uuid(),
  doc_id      uuid    not null references documents(id) on delete cascade,
  name        text    not null,
  definition  text,
  node_type   text,
  chapter     text,
  page        text,
  category    text,
  embedding   vector(2048)
);

-- --------------------------------------------
-- 表：edges（知识关系边）
-- --------------------------------------------
create table edges (
  id            uuid primary key default gen_random_uuid(),
  source_id     uuid not null references nodes(id) on delete cascade,
  target_id     uuid not null references nodes(id) on delete cascade,
  relation_type text not null check (
    relation_type in ('前置依赖', '并列', '包含', '应用')
  ),
  description   text,
  merge_log     text
);

-- --------------------------------------------
-- 索引（加速常用查询）
-- --------------------------------------------
create index idx_nodes_doc_id     on nodes(doc_id);
create index idx_nodes_node_type  on nodes(node_type);
create index idx_nodes_category   on nodes(category);
create index idx_edges_source_id  on edges(source_id);
create index idx_edges_target_id  on edges(target_id);

-- 向量相似度索引（IVFFlat，适合中等数据量；数据量大时可换 HNSW）
create index idx_nodes_embedding on nodes
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- --------------------------------------------
-- RPC 函数：match_nodes（向量相似度检索）
-- --------------------------------------------
create or replace function match_nodes(
  query_embedding vector(2048),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  doc_id uuid,
  name text,
  definition text,
  node_type text,
  chapter text,
  page text,
  category text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    n.id, n.doc_id, n.name, n.definition, n.node_type,
    n.chapter, n.page, n.category,
    1 - (n.embedding <=> query_embedding) as similarity
  from nodes n
  where n.embedding is not null
    and 1 - (n.embedding <=> query_embedding) > match_threshold
  order by n.embedding <=> query_embedding
  limit match_count;
end;
$$;
