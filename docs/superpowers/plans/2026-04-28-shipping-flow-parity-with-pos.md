# Shipping Flow Parity With POS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/shipping` behave like POS for the first half of the workflow: business origin is automatic, customer selection auto-picks the latest address, and the summary/map behave the same way.

**Architecture:** Keep the existing shipping page shell, but move the state derivation to the page level so `origin` always comes from the selected business and `destination` always comes from the selected customer address. Reuse the existing shipping summary and route modal; only change how the page chooses and refreshes the selected address list and how the customer panel renders selection state.

**Tech Stack:** Next.js App Router, React, `react-hook-form`, `@react-google-maps/api`, Nominatim HTTP endpoints, existing POS shipping summary/map components.

---

### Task 1: Derive origin from business selection

**Files:**
- Modify: `src/app/(admin)/shipping/page.tsx`

- [ ] **Step 1: Update business selection state**

```tsx
const handleSelectBusiness = (businessId: string) => {
  const business = businessesData?.find((item) => item.id === businessId) || null;
  setSelectedBusiness(business);
  setOrigin(
    business
      ? {
          id: business.id,
          name: `${business.name} (Matriz)`,
          address_line: business.address_line,
          latitude: business.latitude,
          longitude: business.longitude,
        }
      : null
  );
  setSelectedCustomer(null);
  setSelectedAddress(null);
  setOrderItems([]);
  setIsBusinessOpen(false);
  setIsCustomerOpen(true);
};
```

- [ ] **Step 2: Remove the visible origin step from the page layout**

```tsx
{/*
  Remove the collapsible Step 2 card entirely.
  Origin is now derived from the selected business and kept in state.
*/}
```

- [ ] **Step 3: Keep origin synchronized for business owners on initial load**

```tsx
useEffect(() => {
  if (isBusinessOwner && businessesData && businessesData.length > 0 && !selectedBusiness) {
    const business = businessesData[0];
    setSelectedBusiness(business);
    setOrigin({
      id: business.id,
      name: `${business.name} (Matriz)`,
      address_line: business.address_line,
      latitude: business.latitude,
      longitude: business.longitude,
    });
    setIsBusinessOpen(false);
    setIsCustomerOpen(true);
  }
}, [isBusinessOwner, businessesData, selectedBusiness]);
```

- [ ] **Step 4: Verify the page still computes shipping with the derived origin**

```bash
npx eslint src/app/(admin)/shipping/page.tsx
```

### Task 2: Match POS customer/address behavior

**Files:**
- Modify: `src/app/(admin)/shipping/components.tsx`
- Modify: `src/app/(admin)/shipping/page.tsx`

- [ ] **Step 1: Extend `CustomerDisplay` to show selected address state**

```tsx
interface CustomerDisplayProps {
  customer: Customer;
  addresses: CustomerAddress[];
  selectedAddress: CustomerAddress | null;
  onSelectAddress: (address: CustomerAddress) => void;
  onClearCustomer: () => void;
  onShowMap: () => void;
  onAddAddress: () => void;
  onEditAddress: (address: CustomerAddress) => void;
  isLoadingAddresses: boolean;
}
```

- [ ] **Step 2: Auto-select the latest address when addresses load**

```tsx
useEffect(() => {
  if (!selectedCustomer) return;
  if (!customerAddresses || customerAddresses.length === 0) {
    setSelectedAddress(null);
    return;
  }
  if (!selectedAddress || !customerAddresses.some((address) => address.id === selectedAddress.id)) {
    const latestAddress = customerAddresses[0];
    setSelectedAddress(latestAddress);
  }
}, [selectedCustomer, customerAddresses, selectedAddress]);
```

- [ ] **Step 3: Render the customer panel like POS and keep the map button disabled until an address exists**

```tsx
<CustomerDisplay
  customer={selectedCustomer}
  addresses={customerAddresses || []}
  selectedAddress={selectedAddress}
  onSelectAddress={handleSelectAddress}
  onClearCustomer={() => handleSelectCustomer(null)}
  onAddAddress={() => handleOpenAddressModal(null)}
  onEditAddress={(addr) => handleOpenAddressModal(addr)}
  onShowMap={() => setIsMapModalOpen(true)}
  isLoadingAddresses={isLoadingAddresses}
/>
```

- [ ] **Step 4: Select the last address again after adding/editing a customer address**

```tsx
<AddressFormModal
  ...
  onSaved={() => {
    void refetchAddresses();
  }}
/>
```

- [ ] **Step 5: Verify the customer flow and address selection render correctly**

```bash
npx eslint src/app/(admin)/shipping/components.tsx src/app/(admin)/shipping/page.tsx
```

### Task 3: Preserve summary and modal parity

**Files:**
- Modify: `src/app/(admin)/shipping/page.tsx`
- Modify: `src/app/(admin)/shipping/components.tsx`

- [ ] **Step 1: Keep shipping summary driven by `origin` and `destination`**

```tsx
<ShippingSummary
  business={selectedBusiness}
  customer={selectedCustomer}
  origin={origin}
  destination={destination}
  packageDescription={packageDescription}
  isMapsLoaded={isLoaded}
  onCreateShipping={handleCreateShipping}
  isCreating={createOrderMutation.isPending}
  onOpenMap={(shippingInfo) => {
    setShippingInfoForMap(shippingInfo);
    setIsMapModalOpen(true);
  }}
/>
```

- [ ] **Step 2: Keep the route modal unchanged except for the derived origin**

```tsx
<ShippingMapModal
  isOpen={isMapModalOpen}
  onClose={() => setIsMapModalOpen(false)}
  origin={origin}
  destination={destination}
  isMapsLoaded={isLoaded}
  shippingInfo={shippingInfoForMap}
/>
```

- [ ] **Step 3: Confirm the route modal still draws the route and markers**

```bash
npx eslint src/app/(admin)/shipping/components.tsx
```

- [ ] **Step 4: Run a final diff check**

```bash
git diff --check
```

