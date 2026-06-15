export type AdminListingKind = "stud" | "showcase" | "sale" | "marketplace";

/** Normalize UI/API listing type strings (e.g. Marketplace vs marketplace) for admin flows. */
export function adminListingKind(type: string | undefined | null): AdminListingKind | null {
  const t = (type || "").toString().trim().toLowerCase();
  if (t === "stud") return "stud";
  if (t === "showcase") return "showcase";
  if (t === "sale") return "sale";
  if (t === "marketplace") return "marketplace";
  if (t === "marketplace_product") return "marketplace";
  return null;
}

export function tableForAdminListingKind(kind: AdminListingKind): string {
  switch (kind) {
    case "stud":
      return "stud_listings";
    case "showcase":
      return "showcase_listings";
    case "sale":
      return "sale_listings";
    case "marketplace":
      return "marketplace_products";
  }
}
