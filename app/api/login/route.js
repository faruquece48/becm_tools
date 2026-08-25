const rolePasswords = {
  teacher: "TEACHER_PASSWORD",
  student: "STUDENT_PASSWORD",
  staff: "STAFF_PASSWORD",
};

export async function POST(request) {
  const { email, password, role } = await request.json();
  const passwordKey = rolePasswords[role];
  const valid = passwordKey &&
    email?.trim().toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase() &&
    password === process.env[passwordKey];

  if (!valid) {
    return Response.json(
      { message: "Email, password, or selected role is incorrect." },
      { status: 401 }
    );
  }
  return Response.json({ ok: true, role });
}

