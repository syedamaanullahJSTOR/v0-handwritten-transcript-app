import { getDocumentById as getDocById } from "./actions"

export async function getDocumentById(id: string) {
  return getDocById(id)
}
