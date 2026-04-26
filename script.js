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
      node.textContent = new Date().getFullYear().toString();
    });
  }

  function initHeaderState() {
    const updateHeader = () => {
      doc.body.classList.toggle("is-scrolled", win.scrollY > 14);
    };

    updateHeader();
    win.addEventListener("scroll", updateHeader, { passive: true });
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
      if (win.innerWidth > 820) {
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
        threshold: 0.16,
        rootMargin: "0px 0px -8% 0px"
      }
    );

    elements.forEach((element) => observer.observe(element));
  }

  function initCounters() {
    const counters = Array.from(doc.querySelectorAll("[data-counter]"));

    if (!counters.length) {
      return;
    }

    const animate = (node) => {
      const target = Number.parseInt(node.getAttribute("data-counter") || "0", 10);

      if (!Number.isFinite(target)) {
        return;
      }

      if (prefersReducedMotion) {
        node.textContent = String(target);
        return;
      }

      const duration = 1100;
      const startTime = performance.now();

      const tick = (time) => {
        const progress = Math.min((time - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        node.textContent = String(Math.round(target * eased));

        if (progress < 1) {
          win.requestAnimationFrame(tick);
        } else {
          node.textContent = String(target);
        }
      };

      win.requestAnimationFrame(tick);
    };

    if (!("IntersectionObserver" in win) || prefersReducedMotion) {
      counters.forEach(animate);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          animate(entry.target);
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.6
      }
    );

    counters.forEach((node) => observer.observe(node));
  }

  function initFaq() {
    const items = Array.from(doc.querySelectorAll(".faq-item"));

    if (!items.length) {
      return;
    }

    items.forEach((item) => {
      const button = item.querySelector(".faq-question");
      const answer = item.querySelector(".faq-answer");

      if (!button || !answer) {
        return;
      }

      button.addEventListener("click", () => {
        const isExpanded = button.getAttribute("aria-expanded") === "true";

        items.forEach((otherItem) => {
          const otherButton = otherItem.querySelector(".faq-question");
          const otherAnswer = otherItem.querySelector(".faq-answer");

          if (!otherButton || !otherAnswer || otherButton === button) {
            return;
          }

          otherButton.setAttribute("aria-expanded", "false");
          otherAnswer.hidden = true;
        });

        button.setAttribute("aria-expanded", isExpanded ? "false" : "true");
        answer.hidden = isExpanded;
      });
    });
  }

  function getFields(form) {
    return Array.from(form.querySelectorAll("[data-required], [data-optional-validate]"));
  }

  function getFieldHelp(field) {
    const wrapper = field.closest(".field");

    if (!wrapper) {
      return null;
    }

    return wrapper.querySelector("small");
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
    } else if (value && field.type === "tel" && value.replace(/[^\d+]/g, "").length < 6) {
      message = "Indiquez un numéro de téléphone valide.";
    } else if (value && field.tagName === "TEXTAREA" && value.length < 24) {
      message = "Ajoutez un peu plus de contexte pour bien cadrer la demande.";
    }

    if (message || forceMessage || field.dataset.touched === "true") {
      setFieldState(field, message);
    }

    return !message;
  }

  function initForms() {
    const forms = Array.from(doc.querySelectorAll("[data-form]"));

    if (!forms.length) {
      return;
    }

    forms.forEach((form) => {
      const fields = getFields(form);
      const successMessage = form.parentElement?.querySelector(".success-message");
      const submitButton = form.querySelector("button[type='submit']");
      const initialLabel = submitButton ? submitButton.textContent : "";

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

        if (successMessage) {
          successMessage.classList.remove("is-visible");
        }

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

          return;
        }

        if (submitButton) {
          submitButton.disabled = true;
          submitButton.setAttribute("aria-busy", "true");
          submitButton.textContent = "Envoi en cours…";
        }

        win.setTimeout(() => {
          form.reset();

          fields.forEach((field) => {
            delete field.dataset.touched;
            setFieldState(field, "");
          });

          if (submitButton) {
            submitButton.disabled = false;
            submitButton.removeAttribute("aria-busy");
            submitButton.textContent = initialLabel;
          }

          if (successMessage) {
            successMessage.classList.add("is-visible");
          }
        }, 420);
      });
    });
  }

  onReady(() => {
    setCurrentYear();
    initHeaderState();
    initNav();
    initRevealAnimations();
    initCounters();
    initFaq();
    initForms();
  });
})();
