export function required(value, message = 'Ce champ est requis') {
  if (!String(value ?? "").trim()) {
    throw new Error(message)
  }
}

export function validateForm(data, rules) {
  const errors = {}

  for (const field in rules) {
    const fieldRules = rules[field]

    for (const rule of fieldRules) {
      try {
        if (typeof rule === 'function') {
          rule(data[field])
        } else if (rule === 'required') {
          required(data[field])
        }
      } catch (e) {
        errors[field] = e.message
        break
      }
    }
  }

  return errors
}

export function validatePhone(phone) {
  return /^[0-9]{9,10}$/.test(phone)
}

import { recupererTousLesUtilisateurs } from '@/services/userService.js'

export async function verifierTelephoneExiste(telephoneSaisi) {
  const utilisateurs = await recupererTousLesUtilisateurs()
  return utilisateurs.some(u => u.telephone === telephoneSaisi)
}
