// Re-export shim: the FastAPI client was split into ./fastapi/*.
// Existing imports from '@/lib/fastapi-client' keep working unchanged.

export * from './fastapi';
