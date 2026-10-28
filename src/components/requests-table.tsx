import { ReviewButtons } from "@/components/review-buttons";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRange, yearOf } from "@/lib/dates";
import type { RequestRow } from "@/lib/types";

export function RequestsTable({
  rows,
  showPerson = false,
  review = false,
}: {
  rows: RequestRow[];
  showPerson?: boolean;
  review?: boolean;
}) {
  const columns = 4 + (showPerson ? 1 : 0) + (review ? 1 : 0);

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {showPerson ? <TableHead>Munkavállaló</TableHead> : null}
          <TableHead>Időszak</TableHead>
          <TableHead>Időtartam</TableHead>
          <TableHead>Jogcím</TableHead>
          <TableHead>Státusz</TableHead>
          {review ? <TableHead className="text-right">Döntés</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns} className="py-8 text-center text-muted-foreground">
              Nincs megjeleníthető igény.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.id}>
              {showPerson ? (
                <TableCell>
                  <span className="block font-semibold">{row.personName}</span>
                  <span className="text-xs text-muted-foreground">{row.department}</span>
                </TableCell>
              ) : null}
              <TableCell>
                <span className="block font-semibold">{formatRange(row.startDate, row.endDate)}</span>
                <span className="text-xs text-muted-foreground">{yearOf(row.startDate)}</span>
              </TableCell>
              <TableCell>{row.workDays} nap</TableCell>
              <TableCell>{row.typeName}</TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
              {review ? (
                <TableCell>
                  <ReviewButtons id={row.id} />
                </TableCell>
              ) : null}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
