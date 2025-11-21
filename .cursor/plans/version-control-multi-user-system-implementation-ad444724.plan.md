<!-- ad444724-e16c-4a23-93a2-a8c2017d693f 0b5c49aa-97f1-49d8-9645-4b7bbcdfd704 -->
# Version Control & Multi-User System Implementation

## 1. Core Architecture: `VersionContext`

Create a React Context (`src/context/VersionContext.tsx`) to manage:

- **Current User**: (Louis, Michiel, Tim, etc.) - for identification.
- **Active Version**: The data scope being viewed/edited.
- ID format: `user_{name}` (Personal), `shared_key` (Draft), `shared_concrete` (Final).
- **Versioning Logic**:
- `getData(key)`: Retrieves data from localStorage with the active version prefix.
- `setData(key, value)`: Saves data with the active version prefix.
- `pushKeyToConcrete()`: Copies all `shared_key_*` data to `shared_concrete_*`.

## 2. Entry Screen (`Login.tsx`)

Create a new initial view that forces a selection before entering the app:

- **User Selection**: "Who are you?" (Buttons for each team member).
- **Mode Selection**:
- "My Personal Sandbox" (Work alone).
- "Shared Key / Draft" (Collaborate - **Recommended**).
- "Shared Concrete / Final" (View/Publish only).

## 3. Storage Migration

Update existing pages to use `VersionContext` for data access instead of direct `localStorage` or `supabase` calls (assuming we stick to localStorage for this prototype as per recent file usage).

- **Affected Pages**: `Kosten`, `Planning`, `Dashboard`, `Gastjes` (assuming participant counts affect budget scenarios).
- **Unaffected Page**: `Werkgroep` (remains global/shared regardless of version).

## 4. UI Components

- **Version Banner**: A persistent top bar indicating the current active version and user.
- **Push Button**: Only visible when in "Shared Key" version.
- Text: "Push Draft to Concrete".
- Action: Copies budget, planning, and participant scenarios to the "Concrete" version.
- Confirmation: "Are you sure? This will overwrite the official plan."

## 5. Routing Updates

- Wrap `App.tsx` content in `VersionProvider`.
- Conditionally render `Login` screen if no session is active.

## 6. Implementation Details

- **Prefixing**: All localStorage keys for versioned data will be prefixed (e.g., `shared_key_kosten_items`, `louis_gastjes_data`).
- **Initialization**: When a new personal version is created for the first time, it can optionally seed data from the `shared_key` version so they don't start empty.

### To-dos

- [ ] Create src/context/VersionContext.tsx with provider and push logic
- [ ] Create src/pages/Login.tsx for user/version selection
- [ ] Update App.tsx to include VersionProvider and conditional Login rendering
- [ ] Refactor Kosten.tsx to use VersionContext for data
- [ ] Refactor Planning.tsx to use VersionContext for data
- [ ] Refactor Gastjes.tsx to use VersionContext for data
- [ ] Refactor Dashboard.tsx to use VersionContext for data
- [ ] Implement VersionBanner component for navigation/push actions