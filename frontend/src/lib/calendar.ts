import * as jalaali from "jalaali-js";

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export function toJalali(date: Date) {
  return jalaali.toJalaali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );
}

export function toGregorian(
  jy: number,
  jm: number,
  jd: number
): Date {
  const g = jalaali.toGregorian(jy, jm, jd);
  return new Date(g.gy, g.gm - 1, g.gd);
}

export function getDaysInJalaliMonth(
  year: number,
  month: number
) {
  return jalaali.jalaaliMonthLength(year, month);
}

export function isLeapJalaliYear(year: number) {
  return jalaali.isLeapJalaaliYear(year);
}