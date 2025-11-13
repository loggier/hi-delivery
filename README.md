# Hi Delivery Admin Panel

This is a Next.js starter project for the "Hi Delivery" admin panel, built with Firebase Studio.

It features a complete, mock-data-driven administrative dashboard with CRUD operations for managing businesses, riders, products, and more.

## ✨ Features

- **Modern Tech Stack**: Next.js 14 (App Router), React, TypeScript, TailwindCSS.
- **Component-Based UI**: Built with the excellent [shadcn/ui](https://ui.shadcn.com/).
- **State Management**: Client-side state managed by [Zustand](https://github.com/pmndrs/zustand).
- **Data Fetching**: Mock API with simulated latency using Route Handlers, managed by [TanStack Query](https://tanstack.com/query/latest).
- **Forms**: Type-safe forms powered by [React Hook Form](https://react-hook-form.com/) and [Zod](https://zod.dev/).
- **Authentication**: Mock authentication flow with role-based access control (middleware protection).
- **Theming**: Light and Dark mode support with `next-themes`.
- **Comprehensive CRUD Modules**:
  - Businesses
  - Riders (with mock file uploads)
  - Products
  - Categories
  - System Users
- **Responsive Design**: Collapsible sidebar and a fully responsive interface.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd hi-delivery-admin-panel
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

The application will be available at [http://localhost:9002](http://localhost:9002).

## 🛠️ Available Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts a production server.
- `npm run lint`: Lints the codebase.
- `npm run typecheck`: Runs the TypeScript compiler to check for type errors.

## 🎨 Customization

### Color Palette

The primary color theme can be easily customized. The core brand colors are defined as CSS variables in `src/app/globals.css`.

To change the theme:

1.  Open `src/app/globals.css`.
2.  Find the `:root` and `.dark` blocks.
3.  Replace the HSL values for `--hid-primary`, `--hid-secondary`, and `--hid-accent` with your brand's colors. You can use an online converter to get HSL values from Hex codes.

```css
:root {
  --hid-primary: 221 98% 53%; /* #0F62FE */
  --hid-secondary: 28 100% 50%; /* #FF6F00 */
  --hid-accent: 165 100% 35%; /* #00B388 */
  /* ... other variables ... */
}
```

The rest of the UI (buttons, backgrounds, etc.) will automatically adapt to these changes.

### Fonts

The project uses 'Inter' from Google Fonts. To change it:
1.  Update the font links in `src/app/layout.tsx`.
2.  Update the `fontFamily` configuration in `tailwind.config.ts`.

##  Mocks and Data

All data in this application is mocked and served from in-memory fixtures.

- **Data Fixtures**: The seed data is located in `src/mocks/data.ts`. You can modify these arrays to change the initial data set.
- **Mock API Endpoints**: The mock API is implemented using Next.js Route Handlers in `src/app/api/mock/`. Each module has its own folder containing `route.ts` files that simulate a real REST API, including artificial latency.

##  migrating to a Real Backend (e.g., Firebase)

This starter is designed to be easily migrated to a production backend like Firebase.

1.  **Authentication**:
    - Replace the `zustand` mock auth store (`src/store/auth-store.ts`) with Firebase Authentication.
    - Update the middleware (`middleware.ts`) to verify Firebase auth tokens instead of a mock cookie.
    - Implement real sign-in/sign-out flows using the Firebase SDK.

2.  **Database (Firestore)**:
    - In `src/lib/api.ts`, replace the `fetch` calls to the mock API with calls to the Firebase Firestore SDK.
    - Remove the `src/app/api/mock` directory.
    - Update the TanStack Query functions (`getCategories`, `createCategory`, etc.) to interact with Firestore collections.

3.  **Storage (Cloud Storage for Firebase)**:
    - In the file upload components (`src/components/file-upload.tsx`), replace the mock upload logic with logic to upload files to a Cloud Storage bucket.
    - You will need to manage upload progress and store the final file URL in Firestore.
