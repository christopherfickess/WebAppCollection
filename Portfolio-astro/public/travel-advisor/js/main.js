// Entry point: hand the content to the components, then register them.
// Registering upgrades every matching tag already in the page.
import { setStore } from "./core.js";
import { content } from "./data.js";
import { SiteHeader } from "./components/site-header.js";
import { ItineraryCard } from "./components/itinerary-card.js";
import { StepList } from "./components/step-list.js";
import { TripCard, TripGrid } from "./components/trip-card.js";
import { IncludedList } from "./components/included-list.js";
import { SiteFooter } from "./components/site-footer.js";

setStore(content);

[SiteHeader, ItineraryCard, StepList, TripCard, TripGrid, IncludedList, SiteFooter].forEach((C) => C.define());
