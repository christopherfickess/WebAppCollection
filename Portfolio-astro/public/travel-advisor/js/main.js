// Entry point: hand the content to the components, then register them.
// Registering upgrades every matching tag already in the page, on any
// page of the template (home, destinations index, each guide).
import { setStore } from "./core.js";
import { content } from "./data.js";
import { SiteHeader } from "./components/site-header.js";
import { SiteFooter } from "./components/site-footer.js";
import { ItineraryCard } from "./components/itinerary-card.js";
import { StepList } from "./components/step-list.js";
import { DefinitionList, IncludedList, PlaceList, FactList } from "./components/definition-list.js";
import { SeasonChart } from "./components/season-chart.js";
import { DestinationCard, DestinationGrid } from "./components/destination-card.js";
import { GuidePage } from "./components/guide-page.js";
import { PhotoHero } from "./components/photo-hero.js";
import { DayTrips } from "./components/day-trips.js";
import { PhotoGallery } from "./components/photo-gallery.js";
import { ContactForm } from "./components/contact-form.js";

setStore(content);

[
  SiteHeader,
  SiteFooter,
  ItineraryCard,
  StepList,
  DefinitionList,
  IncludedList,
  PlaceList,
  FactList,
  SeasonChart,
  DestinationCard,
  DestinationGrid,
  GuidePage,
  PhotoHero,
  DayTrips,
  PhotoGallery,
].forEach((C) => C.define());

ContactForm.attach()?.prefillFromQuery();
