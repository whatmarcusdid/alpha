# Project Blueprint

## Overview

This document outlines the plan for creating a "My Speed and Safety" page in the dashboard. This page will display the results of a Lighthouse audit, providing users with a clear understanding of their website's performance, accessibility, best practices, and SEO. It also documents the process of updating the SVG icons and the data row styling used in the booking schedule page.

## Plan

1.  **Create the directory:** Create the `app/dashboard/my-speed-and-safety` directory.
2.  **Create `page.tsx`:** Create the `app/dashboard/my-speed-and-safety/page.tsx` file. This file will contain the main component for the page, which will display the Lighthouse scores in a visually appealing and easy-to-understand format.
3.  **Create `layout.tsx`:** Create the `app/dashboard/my-speed-and-safety/layout.tsx` file to provide a consistent layout for this section of the dashboard.
4.  **Create `loading.tsx`:** Create the `app/dashboard/my-speed-and-safety/loading.tsx` file to display a loading indicator while the Lighthouse data is being fetched.
5.  **Create `error.tsx`:** Create the `app/dashboard/my-speed-and-safety/error.tsx` file to handle any errors that may occur while fetching the Lighthouse data.

## SVG Icon Updates

1.  **Update `BusinessName.svg`:** The `BusinessName.svg` icon has been updated with a new design.
2.  **Update `BusinessOwnerFirstName.svg`:** The `BusinessOwnerFirstName.svg` icon has been updated with a new design.
3.  **Update `BusinessOwnerLastName.svg`:** The `BusinessOwnerLastName.svg` icon has been updated with a new design.
4.  **Update `BusinessEmail.svg`:** The `BusinessEmail.svg` icon has been updated with a new design and the unnecessary style attributes have been removed from the `<img>` tag.
5.  **Update `BusinessWebsiteURL.svg`:** The `BusinessWebsiteURL.svg` icon has been updated with a new design and the unnecessary style attributes have been removed from the `<img>` tag.
6.  **Update `Trade_ServiceType.svg`:** The `Trade_ServiceType.svg` icon has been updated with a new design and the unnecessary style attributes have been removed from the `<img>` tag.
7.  **Update `NumberOfEmployees.svg`:** The `NumberOfEmployees.svg` icon has been updated with a new design and the unnecessary style attributes have been removed from the `<img>` tag.
8.  **Update `BiggestFrustration.svg`:** The `BiggestFrustration.svg` icon has been updated with a new design and the unnecessary style attributes have been removed from the `<img>` tag.

## Data Row Styling Update

1.  **Update Data Row Styling:** The data rows in `app/book-call/schedule/page.tsx` have been updated to improve the layout and readability of the booking information. The changes include adding a `gap-4` to the inner `div` and adding `text-left` to the value `p` tag.
