import { addDays, format, isAfter, isBefore, startOfDay, subDays } from 'date-fns';

export interface Cycle {
  id: string;
  startDate: Date; // LMP
  cycleLength: number;
}

export interface MedicationSchedule {
  startDate: Date;
  endDate: Date;
  medicationName: string;
  dosage: string;
}

export interface FollowUpSchedule {
  startDate: Date;
  endDate: Date;
  description: string;
}

export const SUCCESS_MESSAGES = [
  "太棒了！又完成了一次小小的坚持。",
  "身体感受到了你的呵护，正在变好哦。",
  "记录成功，今天也要继续爱自己。",
  "准时服药的你，真是优雅又自律。",
  "每一片药，都是通往健康的一块基石。",
];

export function getRandomSuccessMessage() {
  return SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)];
}

export const ENCOURAGEMENTS = [
  "每一天都在变得更好，加油呀！",
  "温柔对待自己，你是最棒的。",
  "小小的坚持，会带来大大的改变。",
  "记得给自己一个微笑，今天也很棒哦。",
  "按时吃药，是对身体最温柔的呵护。",
  "身体在慢慢恢复，感受那份力量吧。",
  "你值得所有的美好与健康。",
  "慢慢来，比较快，一切都在变好。",
];

export function getRandomEncouragement() {
  return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
}

export function calculateMedication(lmp: Date): MedicationSchedule {
  const start = addDays(startOfDay(lmp), 13); // D14
  const end = addDays(start, 9); // 10 days
  return {
    startDate: start,
    endDate: end,
    medicationName: '地屈孕酮片',
    dosage: '早晚各一片',
  };
}

export function predictNextCycle(lmp: Date, cycleLength: number): Date {
  return addDays(startOfDay(lmp), cycleLength);
}

export function calculateFollowUp(fourthCycleLmp: Date): FollowUpSchedule {
  const start = addDays(startOfDay(fourthCycleLmp), 4); // D5
  const end = addDays(startOfDay(fourthCycleLmp), 6); // D7
  return {
    startDate: start,
    endDate: end,
    description: '复查 B 超',
  };
}
