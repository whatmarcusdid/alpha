# TradeSiteGenie Blueprint

## Overview

TradeSiteGenie is a web application that allows users to manage their website, track leads, and request support from a single dashboard.

## Project Outline

### Implemented Features

*   **Authentication:** Users can sign up and sign in using their email and password, or through Google and Apple for social authentication.
*   **Dashboard:** A central hub for users to view website metrics, access support, and manage their account.
*   **Styling:** The application uses Tailwind CSS for styling, with a custom theme and color palette.

### Current Task: Fix "Internal Server Error"

The application is currently experiencing an "Internal Server Error," which is preventing it from running. The root cause has been identified as the use of unstable and non-existent versions of Next.js, React, and Tailwind CSS.

#### Plan:

1.  **Downgrade Next.js:** Change `next` from `^16.0.7` to `^14.2.4`.
2.  **Downgrade React:** Change `react` and `react-dom` from `^19.2.1` to `^18.3.1`.
3.  **Downgrade React Types:** Change `@types/react` and `@types/react-dom` from `^19` to `^18`.
4.  **Downgrade Tailwind CSS:** Change `tailwindcss` from `^4` to `^3.4.4`.
5.  **Remove `@tailwindcss/postcss`:** This package is not needed for Tailwind CSS v3.
6.  **Run `npm install`:** To apply the dependency changes.
