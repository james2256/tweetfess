import { db } from '@/lib/db'

/** Upsert a setting key-value pair into the database. */
export async function upsertSetting(key: string, value: string) {
  return db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}
