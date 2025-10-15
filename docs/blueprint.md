# **App Name**: Hubs Admin Panel

## Core Features:

- Businesses CRUD: Manage business/restaurant information (create, read, update, delete, list, activate/deactivate) using mock data.
- Riders CRUD: Manage rider information including personal data, contact details, status, and document uploads (INE, proof of address, license, policy). Mock uploads with preview.
- Products CRUD: Manage a global catalog of products per business, including category, name, SKU, price, and active/inactive status. Includes mock image upload.
- Categories CRUD: Manage product categories with name, slug, and active/inactive status.
- Users CRUD: Manage system users (ADMIN role only initially), with a structure prepared for future role expansion.
- Mock Authentication: Implement a mock sign-in/sign-out process setting a mock ADMIN session to access /admin routes.
- Admin Dashboard KPIs: Display key performance indicators (KPIs) like the number of active businesses, riders, products and categories, plus a table showing 'latest changes' combining data from multiple entities.

## Style Guidelines:

- Primary color: Grupo Hubs primary color (#0F62FE), providing a strong, trustworthy base.
- Background color: A desaturated shade of the primary color (#E8F0FE), creating a calm, reliable background.
- Accent color: Grupo Hubs accent color (#00B388), used sparingly for interactive elements and important information, ensuring calls to action stand out.
- Body and headline font: 'Inter', a grotesque sans-serif, offering a modern, machined look ideal for both headlines and body text within the admin panel.
- Use clear and consistent icons from the shadcn/ui library to represent different actions and statuses, improving user comprehension at a glance.
- Admin layout featuring a collapsible sidebar and a topbar with breadcrumbs and a search bar, allowing users to navigate easily and quickly find specific information.
- Subtle transitions and animations to enhance user experience, such as loading skeletons and smooth transitions between different sections of the admin panel.