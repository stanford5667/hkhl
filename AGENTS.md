# Architecture rules
- The home and `/landing` routes use a standalone marketing shell; `/research` and all other product routes retain their existing application shell to isolate landing design changes.
- Landing theme tokens are scoped under `.institutional-landing` in the global stylesheet, so the light marketing experience does not change the application theme.
- Landing financial previews query cached public-market data first and Polygon second, with explicit unavailable states rather than fabricated financial figures.