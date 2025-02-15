import clsx from "clsx";
import { parseISO } from "date-fns";
import { Datetime } from "../datetime";
import { Break } from "./break";
import { Session } from "./session";
import { numberToTime } from "./time-helpers";
import {
  Schedule as ScheduleType,
  Session as SessionType,
  TimeSlot,
} from "./types";

const TalkTime = ({ time }: { time: number }) => {
  const timeAsString = numberToTime(time);

  const isoTime = parseISO(`2022-07-13T${timeAsString}:00+01:00`);

  return (
    <div
      className={clsx(
        "font-bold text-center flex gap-10 justify-center items-center py-3",
        "lg:py-0 lg:flex-col lg:gap-2"
      )}
    >
      <div>
        <Datetime datetime={isoTime} useUserTimezone={false} format={"HH:mm"} />
        <div className="text-xs">(Prague)</div>
      </div>

      <div>
        <Datetime datetime={isoTime} useUserTimezone={true} format={"HH:mm"} />
        <div className="text-xs">(You)</div>
      </div>
    </div>
  );
};

const map = (
  value: number,

  from: { low: number; high: number },
  to: { low: number; high: number }
) => {
  return (
    to.low + ((to.high - to.low) * (value - from.low)) / (from.high - from.low)
  );
};

const ROW_HEIGHT = 25;
const HEADING_ROWS = 2;
const BREAK_ROWS = 3;
const SESSION_ROWS = 6;
const SESSION_ROWS_TUTORIALS = 3;

const getColumnForSession = (session: { rooms: string[] }, rooms: string[]) => {
  const roomIndexes = session.rooms.map((room) => rooms.indexOf(room)).sort();
  const firstRoomIndex = roomIndexes[0];

  // css grids are 1-indexed, plus we have the time column on the left
  const start = 2 + firstRoomIndex;
  const end = start + roomIndexes.length;

  return { start, end };
};

const getRowForTimeSlot = ({
  index,
  rowSizes,
  duration,
  slotDuration,
}: {
  index: number;
  duration: number;
  rowSizes: number[];
  slotDuration: number;
}) => {
  // css grids are 1-indexed, plus we have the rooms rows on the top
  const start =
    1 +
    HEADING_ROWS +
    rowSizes.slice(0, index).reduce((acc, curr) => acc + curr, 0);

  const rowSize = rowSizes[index];

  const proportion = duration / slotDuration;
  const actualSize = Math.ceil(rowSize * proportion);

  const end = start + actualSize;

  return { start, end };
};

const getRowForOrphan = (
  session: { time: number },
  rowSizes: number[],
  slots: TimeSlot[],
  dayType: "Tutorials" | "Talks"
) => {
  const slotsBefore = slots.filter(
    (slot) => slot.type !== "orphan" && slot.time < session.time
  );
  const slotsAfter = slots.filter(
    (slot) => slot.type !== "orphan" && slot.time > session.time
  );

  const slotBefore = slotsBefore[slotsBefore.length - 1];
  const slotBeforeIndex = slots.indexOf(slotBefore);

  const timeDifferenceBefore = session.time - slotBefore.time;
  const rowDifferenceBefore = Math.floor(
    map(
      timeDifferenceBefore,
      { low: 0, high: slotBefore.duration },
      { low: 0, high: getRowSizeForSlot(slotBefore, dayType) }
    )
  );

  const start =
    2 +
    rowSizes.slice(0, slotBeforeIndex).reduce((acc, curr) => acc + curr, 0) +
    rowDifferenceBefore;

  const slotAfter = slotsAfter[0];
  const slotAfterIndex = slots.indexOf(slotAfter);

  const timeDifferenceAfter = slotAfter.time - session.time;
  const rowDifferenceAfter = Math.floor(
    map(
      timeDifferenceAfter,
      { low: 0, high: slotAfter.duration },
      { low: 0, high: getRowSizeForSlot(slotAfter, dayType) }
    )
  );
  const end =
    2 +
    rowSizes.slice(0, slotAfterIndex).reduce((acc, curr) => acc + curr, 0) +
    rowDifferenceAfter;

  return { start, end };
};

const ScheduleSlot = ({
  slot,
  index,
  rowSizes,
  rooms,
}: {
  slot: { time: number; sessions: SessionType[]; duration: number };
  index: number;
  rowSizes: number[];
  rooms: string[];
}) => {
  const row = getRowForTimeSlot({
    index,
    rowSizes,
    duration: slot.duration,
    slotDuration: slot.duration,
  });

  return (
    <div className="sm:grid grid-cols-2 lg:contents">
      <div
        className="schedule-item"
        style={{
          gridColumn: "1 / 3",
          "--grid-column": "1 / 2",
          "--grid-row": `${row.start} / ${row.end}`,
        }}
      >
        <TalkTime time={slot.time} />
      </div>

      {slot.sessions.map((session) => {
        const column = getColumnForSession(session, rooms);
        const row = getRowForTimeSlot({
          index,
          rowSizes,
          slotDuration: slot.duration,
          duration: session.duration,
        });

        return (
          <Session
            key={session.id}
            session={session}
            style={{
              "--grid-column": `${column.start} / ${column.end}`,
              "--grid-row": `${row.start} / ${row.end}`,
            }}
          />
        );
      })}
    </div>
  );
};

const Orphan = ({
  session,
  rooms,
  style,
}: {
  session: SessionType;
  rooms: string[];
  style: React.CSSProperties;
}) => {
  const column = getColumnForSession(session, rooms);

  return (
    <div className="row row-orphan contents">
      <div className="talk__time schedule-item">
        <TalkTime time={session.time} />
      </div>

      <Session
        key={session.id}
        session={session}
        style={{
          "--grid-column": `${column.start} / ${column.end}`,
          ...style,
        }}
      />
    </div>
  );
};

const ScheduleHeader = ({ schedule }: { schedule: ScheduleType }) => {
  const totalRooms = schedule.rooms.length;

  return (
    <div className="hidden lg:contents headings font-bold text-body-light">
      <span
        className="schedule-item flex items-center justify-center px-2 py-4 sticky z-20 top-0 self-start bg-text"
        style={{
          "--grid-row": `1 / ${HEADING_ROWS + 1}`,
          "--grid-column": "1 / 2",
        }}
      >
        Time
      </span>
      {schedule.rooms.map((track, index) => (
        <span
          className="schedule-item flex items-center justify-center px-2 py-4 sticky z-20 top-0 self-start bg-text"
          key={track}
          style={{
            "--grid-row": `1 / ${HEADING_ROWS + 1}`,
            "--grid-column": `${index + 2}/${index + 3}`,
          }}
        >
          {track}
        </span>
      ))}
      <span
        className="schedule-item bg-text sticky z-10 top-0 self-start"
        style={{
          "--grid-row": `1 / ${HEADING_ROWS + 1}`,
          "--grid-column": `1 / ${totalRooms + 2}`,
        }}
      >
        &nbsp;
      </span>
    </div>
  );
};

export const Schedule = ({
  schedule,
  dayType,
}: {
  schedule: ScheduleType;
  dayType: "Tutorials" | "Talks";
}) => {
  const totalRooms = schedule.rooms.length;
  const { rowSizes, gridTemplateRows } = getGridMetrics(schedule, dayType);
  const lastSession = schedule.slots[schedule.slots.length - 1];
  const lastTime = lastSession.time + lastSession.duration;

  return (
    <div>
      <div
        className="lg:grid gap-4 my-8 bg-text text-text-inverted"
        style={{
          gridTemplateRows,
          gridTemplateColumns: `5rem repeat(${totalRooms}, 1fr)`,
        }}
      >
        <ScheduleHeader schedule={schedule} />

        {schedule.slots.map((slot, index) => {
          if (slot.type === "break") {
            const row = getRowForTimeSlot({
              index,
              rowSizes,
              duration: slot.duration,
              slotDuration: slot.duration,
            });

            return (
              <Break
                title={slot.title}
                time={slot.time}
                key={index}
                style={{
                  "--grid-row": `${row.start} / ${row.end}`,
                  "--grid-column": `1 / ${totalRooms + 2}`,
                }}
              />
            );
          }

          if (slot.type === "orphan") {
            const row = getRowForOrphan(
              slot.session,
              rowSizes,
              schedule.slots,
              dayType
            );

            return (
              <Orphan
                key={index}
                session={slot.session}
                rooms={schedule.rooms}
                style={{
                  "--grid-row": `${row.start} / ${row.end}`,
                }}
              />
            );
          }

          return (
            <ScheduleSlot
              slot={slot}
              rooms={schedule.rooms}
              index={index}
              key={index}
              rowSizes={rowSizes}
            />
          );
        })}
        <Break
          title={"End of day"}
          time={lastTime}
          style={{
            // "--grid-row": `${rowSizes.length + 1} / ${rowSizes.length + 2}`,
            "--grid-column": `1 / ${totalRooms + 2}`,
          }}
        />
      </div>
    </div>
  );
};

const getRowSizeForBreak = (duration: number) => {
  return Math.ceil(BREAK_ROWS * (duration / 30));
};

const getRowSizeForSessionsSlot = (
  duration: number,
  dayType: "Tutorials" | "Talks"
) => {
  const base = dayType === "Tutorials" ? SESSION_ROWS_TUTORIALS : SESSION_ROWS;

  return Math.ceil(base * (duration / 30));
};

const getRowSizeForSlot = (
  slot: {
    duration: number;
    type: string;
  },
  dayType: "Tutorials" | "Talks"
) => {
  if (slot.type === "break") {
    return getRowSizeForBreak(slot.duration);
  }

  if (slot.type === "orphan") {
    return 0;
  }

  return getRowSizeForSessionsSlot(slot.duration, dayType);
};

const getGridMetrics = (
  schedule: ScheduleType,
  dayType: "Tutorials" | "Talks"
) => {
  const rowSizes = schedule.slots.map((slot) =>
    getRowSizeForSlot(slot, dayType)
  );

  // this also includes the rooms row
  const gridTemplateRows = [HEADING_ROWS]
    .concat(rowSizes)
    .filter((size) => size > 0)
    .map((size) => {
      return `repeat(${size}, ${ROW_HEIGHT}px)`;
    })
    .join(" ");

  return { gridTemplateRows, rowSizes };
};
