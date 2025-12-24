# Blueprint: TradeSiteGenie Next.js Application

## Overview

This document outlines the architecture, features, and development plan for the TradeSiteGenie application, a Next.js-based web app built within the Firebase Studio environment.

## Implemented Features

*   **Dashboard Home Page**: Displays key metrics, a support request card, downloadable reports, and a meeting schedule.
*   **My Company Page**: Allows users to view and edit their company information, which is saved to and retrieved from Firestore.
*   **Firestore Integration**: User and company data is stored and managed in Firestore.
*   **Authentication**: Firebase Authentication is used for user sign-in and registration.
*   **Styling**: The application uses Tailwind CSS for a professional and consistent design aesthetic.
*   **Dynamic Components**: The application leverages server and client components for optimal performance.
*   **Booking Intake Form**: A public form at `/book-call` to capture lead information.

## Current Plan: Calendly Scheduling Page

The current development focus is to create a scheduling page at `/book-call/schedule` that embeds Calendly.

### 1. Page Access and Data Loading

*   The page will be public and will not require authentication.
*   It will check `sessionStorage` for a `bookingIntakeId`.
*   If no ID is found, the user will be redirected to `/book-call`.
*   If an ID is found, the corresponding booking intake data will be loaded from the `bookingIntakes` Firestore collection.

### 2. Page Design and Layout

*   The page will have a centered layout with a maximum width of 900px.
*   It will feature the TradeSiteGenie logo in the top left.
*   The design will include a main heading, a subheading, and a bulleted list of what will be covered in the call.

### 3. "Call Goal" Textarea

*   An optional textarea with a 250-character limit will be included for the user to specify what they want to get out of the call.
*   This will have a character counter.
*   The input will be auto-saved to the `bookingIntakes` document in a field called `callGoal` using a debounced function.

### 4. Calendly Integration

*   The `react-calendly` package will be used to embed Calendly's inline widget.
*   The Calendly URL will be `https://calendly.com/marcus-tradesitegenie/websitegameplancall`.
*   The widget will be pre-filled with the user's name and email from the intake form, and the `callGoal` if provided.

### 5. Navigation

*   A "Go Back" button will allow the user to return to the `/book-call` page.

### 6. Styling

*   The project will continue to use TypeScript, Next.js 14+ with the App Router, and Tailwind CSS.
*   The page will have a light warm beige/cream background (`bg-stone-50` or `bg-amber-50`).
*   The main content will be in a white card.
*   The styling will be consistent with the existing TradeSiteGenie brand.
