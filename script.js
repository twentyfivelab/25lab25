(() => {
  "use strict";

  const doc = document;
  const win = window;
  const prefersReducedMotion =
    typeof win.matchMedia === "function" &&
    win.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function onReady(callback) {
    if (doc.readyState === "loading") {
      doc.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }

    callback();
  }

  function setCurrentYear() {
    doc.querySelectorAll("[data-current-year]").forEach((node) => {
      node.textContent = String(new Date().getFullYear());
    });
  }

  function initHeaderState() {
    const update = () => {
      doc.body.classList.toggle("is-scrolled", win.scrollY > 10);
    };

    update();
    win.addEventListener("scroll", update, { passive: true });
  }

  function initNav() {
    const toggle = doc.querySelector(".nav-toggle");
    const nav = doc.querySelector(".site-nav");

    if (!toggle || !nav) {
      return;
    }

    const closeNav = () => {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
      doc.body.classList.remove("nav-open");
    };

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", expanded ? "false" : "true");
      nav.classList.toggle("is-open", !expanded);
      doc.body.classList.toggle("nav-open", !expanded);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeNav);
    });

    doc.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeNav();
      }
    });

    doc.addEventListener("click", (event) => {
      if (
        toggle.getAttribute("aria-expanded") !== "true" ||
        toggle.contains(event.target) ||
        nav.contains(event.target)
      ) {
        return;
      }

      closeNav();
    });

    win.addEventListener("resize", () => {
      if (win.innerWidth > 900) {
        closeNav();
      }
    });
  }

  function initRevealAnimations() {
    const elements = Array.from(doc.querySelectorAll(".reveal"));

    if (!elements.length) {
      return;
    }

    if (prefersReducedMotion || !("IntersectionObserver" in win)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -8% 0px"
      }
    );

    elements.forEach((element) => observer.observe(element));
  }

  function getFields(form) {
    return Array.from(form.querySelectorAll("[data-required], [data-optional-validate]"));
  }

  function getFieldHelp(field) {
    return field.closest(".field")?.querySelector("small") || null;
  }

  function getValue(field) {
    return typeof field.value === "string" ? field.value.trim() : "";
  }

  function setFieldState(field, message) {
    const help = getFieldHelp(field);
    const hasError = Boolean(message);

    field.setAttribute("aria-invalid", hasError ? "true" : "false");

    if (help) {
      help.textContent = message || "";
    }
  }

  function validateField(field, forceMessage) {
    const value = getValue(field);
    const isRequired = field.hasAttribute("data-required");
    let message = "";

    if (!value && isRequired) {
      message = "Ce champ est requis.";
    } else if (value && field.type === "email") {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(value)) {
        message = "Indiquez une adresse e-mail valide.";
      }
    } else if (value && field.type === "tel") {
      const digits = value.replace(/[^\d+]/g, "");

      if (digits.length < 6) {
        message = "Indiquez un numéro de téléphone valide.";
      }
    } else if (value && field.tagName === "TEXTAREA" && value.length < 20) {
      message = "Ajoutez un peu plus de contexte pour bien comprendre votre demande.";
    }

    if (message || forceMessage || field.dataset.touched === "true") {
      setFieldState(field, message);
    }

    return !message;
  }

  function buildMailtoLink(form) {
    const data = new FormData(form);
    const lastName = String(data.get("nom") || "").trim();
    const firstName = String(data.get("prenom") || "").trim();
    const company = String(data.get("societe") || "").trim();
    const email = String(data.get("email") || "").trim();
    const phone = String(data.get("telephone") || "").trim();
    const projectType = String(data.get("type_projet") || "").trim();
    const request = String(data.get("demande") || "").trim();

    const sender = [firstName, lastName].filter(Boolean).join(" ");
    const subjectParts = ["Demande de devis - 25 Lab."];

    if (projectType) {
      subjectParts.push(projectType);
    }

    const bodyLines = [
      "Bonjour 25 Lab.,",
      "",
      "Je vous contacte pour une demande de devis.",
      "",
      `Nom : ${lastName || "-"}`,
      `Prénom : ${firstName || "-"}`,
      `Société : ${company || "-"}`,
      `E-mail : ${email || "-"}`,
      `Téléphone : ${phone || "-"}`,
      `Type de projet : ${projectType || "-"}`,
      "",
      "Demande :",
      request || "-",
      "",
      `Expéditeur : ${sender || email || "Client"}`
    ];

    const action = form.getAttribute("action") || "mailto:contact@25lab.fr";
    const separator = action.includes("?") ? "&" : "?";

    return `${action}${separator}subject=${encodeURIComponent(subjectParts.join(" | "))}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
  }

  function initMailtoForm() {
    const form = doc.querySelector("[data-mailto-form]");

    if (!form) {
      return;
    }

    const status = doc.querySelector("[data-form-status]");
    const fields = getFields(form);

    fields.forEach((field) => {
      setFieldState(field, "");

      const markTouched = () => {
        field.dataset.touched = "true";
      };

      field.addEventListener("input", () => {
        markTouched();
        validateField(field, false);
      });

      field.addEventListener("blur", () => {
        markTouched();
        validateField(field, true);
      });

      field.addEventListener("change", () => {
        markTouched();
        validateField(field, true);
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      let formIsValid = true;

      fields.forEach((field) => {
        field.dataset.touched = "true";
        formIsValid = validateField(field, true) && formIsValid;
      });

      if (!formIsValid) {
        const invalidField = fields.find((field) => field.getAttribute("aria-invalid") === "true");

        if (invalidField) {
          invalidField.focus({ preventScroll: false });
        }

        if (status) {
          status.textContent = "";
        }

        return;
      }

      if (status) {
        status.textContent =
          "Votre messagerie va s'ouvrir avec votre demande préremplie. Si rien ne se passe, écrivez à contact@25lab.fr.";
      }

      win.location.href = buildMailtoLink(form);
    });
  }

  onReady(() => {
    setCurrentYear();
    initHeaderState();
    initNav();
    initRevealAnimations();
    initMailtoForm();
  });
})();
