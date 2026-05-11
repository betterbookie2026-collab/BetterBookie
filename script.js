const form = document.getElementById("signup-form");
const emailInput = document.getElementById("email");
const message = document.getElementById("message");

const menuToggle = document.getElementById("menu-toggle");
const navLinks = document.getElementById("nav-links");

menuToggle.addEventListener("click", function () {
  navLinks.classList.toggle("show");
  const expanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!expanded));
});

// Close mobile menu after clicking a nav link
navLinks.querySelectorAll("a").forEach(function (link) {
  link.addEventListener("click", function () {
    navLinks.classList.remove("show");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const email = emailInput.value.trim();

  if (!email.includes("@") || !email.includes(".")) {
    message.textContent = "Please enter a valid email address.";
    message.style.color = "#fecaca";
    return;
  }

  message.textContent = "Thanks for joining, " + email + "!";
  message.style.color = "#bbf7d0";
  form.reset();
});