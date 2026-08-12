# Shipping Address URL Design

## Goal

Allow operators to paste a Google Maps URL containing coordinates into the
shipping address form and use it to reverse-geocode the address with
Nominatim.

## Behavior

- Add an auxiliary `URL Dirección` input to the create/edit customer-address
  dialog in `/shipping`.
- Accept Google Maps links with coordinates in the `q` query parameter, such
  as `https://maps.google.com/?q=25.786736,-100.470116`.
- Parse latitude and longitude from the URL and validate numeric bounds.
- Call the existing Nominatim reverse endpoint with `format=jsonv2`,
  `addressdetails=1` and `zoom=18`.
- Populate address, street, house number, neighborhood, city, state, postal
  code, latitude and longitude from the reverse result.
- Keep all populated fields editable.
- Preserve the source URL in the existing `reference` field. If the field
  already has content, append the URL after exactly one blank line using the
  label `Ubicación Google Maps:`. Avoid duplicating the same URL.
- Do not persist a separate URL column.
- On invalid URL or reverse failure, show an error and do not overwrite the
  current address values.

## Verification

- Unit-test URL parsing, invalid coordinates and reference appending.
- Run the focused web lint for the modified files and `git diff --check`.
- Run typecheck and record unrelated existing errors if present.
