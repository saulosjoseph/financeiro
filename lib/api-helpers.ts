import { client } from '@/src/db';

/**
 * Verifica se o usuário é membro de uma família
 */
export async function checkFamilyMembership(familyId: string, userId: string) {
  const result = await client`
    SELECT id, family_id, user_id, role, created_at
    FROM family_members
    WHERE family_id = ${familyId} AND user_id = ${userId}
    LIMIT 1
  `;
  
  return result.length > 0 ? result[0] : null;
}

/**
 * Verifica se o usuário é admin de uma família
 */
export async function checkFamilyAdmin(familyId: string, userId: string) {
  const member = await checkFamilyMembership(familyId, userId);
  return member && member.role === 'admin';
}

/**
 * Gera um UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Converte resultado do banco para camelCase
 */
export function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {} as any);
  }
  
  return obj;
}
