function pad(value) {
  return String(value).padStart(2, '0');
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function isValidPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 12;
}

export function isValidName(value) {
  return /^[a-zA-Zа-яА-ЯёЁ'\-\s]{2,}$/.test(String(value || '').trim());
}

export function isStrongPassword(value) {
  return value.length >= 8 && /[A-Z]/.test(value) && /\d/.test(value);
}

export function isValidDateFieldValue(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

export function toDateFieldValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatAgeFromBirthDate(value) {
  if (!isValidDateFieldValue(value)) return '';

  const birthDate = new Date(`${value}T00:00:00`);
  const today = new Date();

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();

  if (today.getDate() < birthDate.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years <= 0) {
    return `${Math.max(months, 1)} mo`;
  }

  return months > 0 ? `${years} yr ${months} mo` : `${years} yr`;
}

export function validateLoginForm({ email, password }) {
  if (!email.trim()) return 'Enter email.';
  if (!isValidEmail(email)) return 'Enter a valid email.';
  if (!password) return 'Enter password.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return '';
}

export function validateRegisterForm(form, tosAccepted) {
  if (!form.firstName.trim()) return 'Enter first name.';
  if (!isValidName(form.firstName)) return 'First name must contain letters only (min 2 characters).';
  if (!form.lastName.trim()) return 'Enter last name.';
  if (!isValidName(form.lastName)) return 'Last name must contain letters only (min 2 characters).';
  if (!form.email.trim()) return 'Enter email.';
  if (!isValidEmail(form.email)) return 'Enter a valid email address.';
  if (!form.phone.trim()) return 'Enter phone number.';
  if (!isValidPhone(form.phone)) return 'Phone must be 10–12 digits (e.g. +7 777 000 0000).';
  if (!form.password) return 'Enter password.';
  if (form.password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(form.password)) return 'Password must contain at least one uppercase letter.';
  if (!/\d/.test(form.password)) return 'Password must contain at least one digit.';
  if (form.confirmPassword !== undefined && form.password !== form.confirmPassword) return 'Passwords do not match.';
  if (!tosAccepted) return 'You must accept the Terms of Service.';
  return '';
}

export function validatePetForm(form) {
  if (!form.name.trim()) return 'Enter pet name.';
  if (!form.species.trim()) return 'Enter species.';
  if (form.birthDate && !isValidDateFieldValue(form.birthDate)) return 'Choose a valid birth date.';
  if (form.birthDate && new Date(`${form.birthDate}T00:00:00`) > new Date()) return 'Birth date cannot be in the future.';
  if (form.weight && !/^\d+([.,]\d+)?(\s?(kg|g))?$/i.test(form.weight.trim())) return 'Weight should look like 5 or 5 kg.';
  return '';
}

export function validateMedicalCardForm(form) {
  if (form.lastVetVisit && !isValidDateFieldValue(form.lastVetVisit)) return 'Choose a valid vet visit date.';
  if (form.lastVetVisit && new Date(`${form.lastVetVisit}T00:00:00`) > new Date()) return 'Vet visit date cannot be in the future.';
  return '';
}

export function validateProfileForm(form) {
  if (!form.firstName.trim()) return 'Enter first name.';
  if (!form.lastName.trim()) return 'Enter last name.';
  if (form.phone && !isValidPhone(form.phone)) return 'Enter a valid phone.';
  return '';
}
