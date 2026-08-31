# Migration and Styling Integration Plan

This document outlines the execution plan for updating the application components and layout files to fully utilize the centralized design system defined in `src/styles.css`. Another agent can follow this plan step-by-step.

## Task Overview

| File Path | Status | Comments / Instructions |
| :--- | :--- | :--- |
| `src/styles.css` | **Done** | Centralized design system created with color variables, typography (Poppins / Inter), spacing, grid system, and components. |
| `src/index.html` | **Done** | Update document title, add accessibility meta tags, ensure Google Fonts (Poppins & Inter) are properly referenced or confirm CSS import works. |
| `src/app/app.html` | **Done** | Integrate the sticky header navigation (`.sticky-header`), mobile drawer component (`.mobile-drawer`), and wrap main router outlet in `.container` with proper `.section-padding`. |
| `src/app/components/home/home.component.html` | **Done** | Apply product cards (`.product-card`, `.card`), quote cards (`.quote-card`), information cards (`.info-card`), and grid system classes (`.row`, `.col-4`, etc.). |
| `src/app/components/checkout/checkout.component.html` | **Done** | Update form elements to use floating labels (`.form-floating`) and inline validation feedback (`.is-invalid`, `.invalid-feedback`, `.is-valid`). |
| `src/app/components/cart/cart.component.html` | **Not Done** | Apply the responsive collapse table classes (`.table`, `.table-responsive-collapse`) and primary/secondary button variants (`.btn-primary`, `.btn-secondary`, `.btn-ghost`). |
| `src/app/components/my-orders/my-orders.component.html` | **Not Done** | Update order tables to be sortable (`.table`, `.sortable`) and wrap modals/cards using standard design system classes. |

## Execution Guidelines for Agent
1. Verify that every component references the correct CSS utility classes from `src/styles.css`.
2. Ensure accessibility requirements (contrast ratios, aria labels, and visible focus states via `:focus-visible`) are maintained across updated views.
3. Mark items as **Done** in this table as each file is successfully refactored and tested.
