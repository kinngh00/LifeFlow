export const BUSAN_CITY_CODE = "26000" as const;

export const BUSAN_DISTRICT_CODES = [
  "26110",
  "26140",
  "26170",
  "26200",
  "26230",
  "26260",
  "26290",
  "26320",
  "26350",
  "26380",
  "26410",
  "26440",
  "26470",
  "26500",
  "26530",
  "26710",
] as const;

export const busanDistrictCodeSet = new Set<string>(BUSAN_DISTRICT_CODES);
