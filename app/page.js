"use client";
import { useState } from "react";

const roles = {
  student: {
    name: "Amina Rahman",
    sub: "Class 10 Â· Section A",
    stats: [
      ["Attendance", "94%"],
      ["Assignments", "4"],
      ["Average grade", "Aâˆ’"],
    ],
    tasks: [
      "Physics lab report",
      "Mathematics practice set",
      "English literature reading",
    ],
    actions: [
      "View timetable",
      "Submit assignment",
      "Check results",
      "Message teacher",
    ],
  },
  teacher: {
    name: "Farhan Ahmed",
    sub: "Science Department",
    stats: [
      ["Classes today", "5"],
      ["Students", "142"],
      ["To review", "18"],
    ],
    tasks: [
      "Grade Class 10 lab reports",
      "Prepare weekly lesson plan",
      "Department meeting",
    ],
    actions: [
      "Take attendance",
      "Create assignment",
      "Enter grades",
      "Message class",
    ],
  },
  staff: {
    name: "Nusrat Jahan",
    sub: "Administration Office",
    stats: [
      ["Requests", "12"],
      ["Visitors today", "28"],
      ["Open notices", "6"],
    ],
    tasks: [
      "Review admission documents",
      "Update transport roster",
      "Publish holiday notice",
    ],
    actions: [
      "Student records",
      "Create notice",
      "Visitor log",
      "Staff directory",
    ],
  },
};
const labels = { student: "Student", teacher: "Teacher", staff: "Staff" };
function Icon({ type = "arrow" }) {
  const p = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    cap: (
      <>
        <path d="m3 8 9-5 9 5-9 5-9-5Z" />
        <path d="M7 11v5c3 2 7 2 10 0v-5" />
      </>
    ),
    book: (
      <>
        <path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 0-3 1V4Z" />
        <path d="M8 8h7" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-2a5 5 0 0 1 10 0v2m3-9a3 3 0 0 0 0-6m1 10a5 5 0 0 1 4 5" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10m6 10V4m6 16v-7m5 7H2" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    bell: (
      <>
        <path d="M6 9a6 6 0 0 1 12 0c0 6 3 6 3 8H3c0-2 3-2 3-8m4 12h4" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    logout: (
      <>
        <path d="M10 17l5-5-5-5m5 5H3" />
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {p[type]}
    </svg>
  );
}

export default function Home() {
  const [screen, setScreen] = useState("home"),
    [role, setRole] = useState("student"),
    [show, setShow] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const open = (r) => {
    setRole(r || role);
    setError("");
    setScreen("login");
  };
  async function login(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password"), role }),
      });
      const result = await response.json();
      if (!response.ok) return setError(result.message);
      setScreen("dashboard");
    } catch {
      setError("Unable to log in. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  if (screen === "dashboard")
    return <Dashboard role={role} logout={() => setScreen("home")} />;
  return (
    <div className="site">
      <Header login={() => open()} />
      {screen === "home" ? (
        <>
          <main className="hero">
            <section>
              <span className="pill">â— Your school, connected</span>
              <h1>
                One place to learn,
                <br />
                <em>teach & grow.</em>
              </h1>
              <p>
                BECM Connect brings students, teachers and staff togetherâ€”making
                every school day simpler, smarter and more connected.
              </p>
              <div className="actions">
                <button className="primary" onClick={() => open()}>
                  Get started <Icon />
                </button>
                <a href="#roles">Explore the platform â†“</a>
              </div>
              <div className="members">
                <span>
                  <i>AR</i>
                  <i>FA</i>
                  <i>NJ</i>
                </span>
                <b>
                  2,400+<small>active community members</small>
                </b>
              </div>
            </section>
            <section className="visual">
              <div className="rings" />
              <div className="center">
                <span>
                  <Icon type="cap" />
                </span>
                <b>Learn together.</b>
                <small>Grow together.</small>
              </div>
              <div className="float one">
                <Icon type="book" />
                <b>
                  12<small>Courses</small>
                </b>
              </div>
              <div className="float two">
                <Icon type="check" />
                <b>
                  94%<small>Attendance</small>
                </b>
              </div>
              <i className="spark">âœ¦</i>
            </section>
          </main>
          <section className="roles" id="roles">
            <span className="eyebrow">Built for everyone</span>
            <h2>Choose how you connect.</h2>
            <p>
              Everything you need, tailored to your role in the school
              community.
            </p>
            <div>
              {Object.keys(roles).map((r, i) => (
                <button key={r} onClick={() => open(r)}>
                  <span className={`roleicon c${i}`}>
                    <Icon type={["book", "users", "chart"][i]} />
                  </span>
                  <b>
                    {labels[r]}s
                    <small>
                      {i === 0
                        ? "Learn, submit work and track progress."
                        : i === 1
                          ? "Teach, assess and inspire every learner."
                          : "Manage operations and keep school moving."}
                    </small>
                  </b>
                  <Icon />
                </button>
              ))}
            </div>
          </section>
        </>
      ) : (
        <main className="login">
          <button className="back" onClick={() => setScreen("home")}>
            â† Back to home
          </button>
          <section>
            <span className="logo big">
              <Icon type="cap" />
            </span>
            <span className="eyebrow">Welcome back</span>
            <h2>Log in to your account</h2>
            <p>Choose your role and enter your admin credentials.</p>
            <div className="tabs">
              {Object.keys(roles).map((r) => (
                <button
                  className={role === r ? "active" : ""}
                  onClick={() => { setRole(r); setError(""); }}
                  key={r}
                >
                  {labels[r]}
                </button>
              ))}
            </div>
            <form onSubmit={login}>
              <label>
                Admin email
                <input name="email" type="email" placeholder="abdullahruet13@gmail.com" autoComplete="username" required />
              </label>
              <label>
                Password
                <span className="pass">
                  <input
                    name="password"
                    type={show ? "text" : "password"}
                    minLength="4"
                    placeholder={`Enter ${labels[role].toLowerCase()} password`}
                    autoComplete="current-password"
                    required
                  />
                  <button type="button" onClick={() => setShow(!show)}>
                    {show ? "Hide" : "Show"}
                  </button>
                </span>
              </label>
              {error && <p className="login-error" role="alert">{error}</p>}
              <div className="meta">
                <label>
                  <input type="checkbox" /> Remember me
                </label>
                <button type="button">Forgot password?</button>
              </div>
              <button className="primary submit" disabled={busy}>
                {busy ? "Checkingâ€¦" : `Log in as ${labels[role]}`} {!busy && <Icon />}
              </button>
            </form>
            <small className="demo">
              Use the assigned test password for the selected role.
            </small>
          </section>
        </main>
      )}
    </div>
  );
}
function Header({ login }) {
  return (
    <header>
      <button className="brand">
        <span className="logo">
          <Icon type="cap" />
        </span>
        BECM <b>Connect</b>
      </button>
      <nav>
        <a href="#roles">Community</a>
        <a href="#roles">Features</a>
        <a href="#roles">About</a>
      </nav>
      <button className="loginbtn" onClick={login}>
        Log in <Icon />
      </button>
    </header>
  );
}
function Dashboard({ role, logout }) {
  const d = roles[role];
  return (
    <div className="dash">
      <aside>
        <div className="brand">
          <span className="logo">
            <Icon type="cap" />
          </span>
          BECM <b>Connect</b>
        </div>
        <div className="profile">
          <span>
            {d.name
              .split(" ")
              .map((x) => x[0])
              .join("")}
          </span>
          <b>
            {d.name}
            <small>{labels[role]}</small>
          </b>
        </div>
        <nav>
          {[
            ["chart", "Overview"],
            ["clock", "My schedule"],
            ["check", "Tasks & work"],
            ["users", "Messages"],
            ["book", "Resources"],
          ].map((x, i) => (
            <button className={i === 0 ? "active" : ""} key={x[1]}>
              <Icon type={x[0]} />
              {x[1]}
            </button>
          ))}
        </nav>
        <button className="logout" onClick={logout}>
          <Icon type="logout" />
          Log out
        </button>
      </aside>
      <main>
        <header className="top">
          <b>{labels[role]} portal</b>
          <span>
            <Icon type="bell" />
            <i>{d.name[0]}</i>
          </span>
        </header>
        <div className="content">
          <section className="welcome">
            <div>
              <span>Tuesday, 25 August</span>
              <h1>Good morning, {d.name.split(" ")[0]}!</h1>
              <p>{d.sub} Â· Hereâ€™s whatâ€™s happening today.</p>
            </div>
            <button className="primary">View calendar</button>
          </section>
          <section className="stats">
            {d.stats.map((x, i) => (
              <article key={x[0]}>
                <span>
                  <Icon type={["check", "book", "chart"][i]} />
                </span>
                <small>{x[0]}</small>
                <b>{x[1]}</b>
              </article>
            ))}
          </section>
          <div className="panels">
            <section className="panel">
              <span className="eyebrow">Stay on track</span>
              <h2>Upcoming</h2>
              {d.tasks.map((x, i) => (
                <div className="task" key={x}>
                  <button />
                  <b>
                    {x}
                    <small>
                      <Icon type="clock" />
                      {i === 0
                        ? "Today, 4:00 PM"
                        : i === 1
                          ? "Tomorrow"
                          : "Friday"}
                    </small>
                  </b>
                  <i>â€º</i>
                </div>
              ))}
            </section>
            <section className="panel">
              <span className="eyebrow">Shortcuts</span>
              <h2>Quick actions</h2>
              <div className="quick">
                {d.actions.map((x, i) => (
                  <button key={x}>
                    <Icon type={["clock", "book", "chart", "users"][i]} />
                    {x}
                  </button>
                ))}
              </div>
            </section>
          </div>
          <section className="notice">
            <b>
              28<small>AUG</small>
            </b>
            <div>
              <span className="eyebrow">School announcement</span>
              <h3>Annual cultural programme registration is now open</h3>
              <p>Register by Friday through the activities office.</p>
            </div>
            <button>
              Read notice <Icon />
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}

