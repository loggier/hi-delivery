# Shipping Map Center Reverse Design

## Goal

Allow shipping address coordinates to be selected consistently through text
search, map clicks, or by moving the map beneath the fixed customer marker.

## Behavior

- Keep the customer marker fixed at the visual center of the map.
- When the operator finishes dragging or panning the map, read the visible
  map center as the selected coordinate.
- Reverse-geocode that coordinate through the existing Nominatim reverse
  endpoint.
- On success, update address, street, house number, neighborhood, city, state,
  postal code, latitude and longitude.
- On reverse failure, still update latitude and longitude from the map center,
  preserve editable existing address fields, and show a non-blocking error.
- A text search result, a map click, or a map-center selection must all update
  the same `LocationMap` state and form values.
- Saving always submits the latest selected latitude and longitude, regardless
  of which selection method produced them.
- The existing URL helper remains available and follows the same state path.

## Interaction Details

- Reverse geocoding runs after map movement settles, not on every drag frame.
- A short debounce prevents duplicate requests from repeated map idle events.
- While reverse geocoding is active, show a small loading state without
  blocking map interaction.
- The fixed marker remains visual only; the actual selected coordinate is the
  map center.

## Verification

- Validate the map center callback updates latitude and longitude.
- Validate reverse success populates address fields.
- Validate reverse failure preserves coordinates and editable fields.
- Run focused ESLint and syntax/type validation for changed files.
