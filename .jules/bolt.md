## 2024-05-18 - [Preventing Unnecessary Recalculations in Top-Level Components]
**Learning:** Found an anti-pattern in the React components: iterating and reducing large data arrays directly in the render path of components that also have frequently changing local state (like UI toggles, toasts, and loading states).
**Action:** Use `useMemo` for any iteration or aggregation (like reducing `totals` arrays) inside high-level components with mixed concerns (data + frequent state updates).
