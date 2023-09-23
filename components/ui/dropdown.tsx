import * as React from "react";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import ListSubheader from "@mui/material/ListSubheader";
import FormControl from "@mui/material/FormControl";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import { segmentProps } from "../const";

export interface GroupedSelectProps {
  setReplica: React.Dispatch<React.SetStateAction<number>>;
  segments: segmentProps[];
  individualUserSegments: segmentProps[];
}
export default function GroupedSelect({
  segments,
  individualUserSegments,
  setReplica,
}: GroupedSelectProps) {
  const handleChange = (event: SelectChangeEvent) => {
    setReplica(Number(event.target.value));
  };
  return (
    <div>
      <FormControl sx={{ m: 1, minWidth: 300 }}>
        {/* <InputLabel htmlFor="grouped-select">All Customers</InputLabel> */}
        <Select
          defaultValue={"0"}
          onChange={handleChange}
          //   id="grouped-select"
          //   label="Grouping"
          //   displayEmpty={false}
        >
          <ListSubheader>Segment</ListSubheader>
          {segments.length > 0 &&
            segments.map((segment: segmentProps, index: number) => {
              return (
                <MenuItem key={index} value={index}>
                  {segment.name}
                </MenuItem>
              );
            })}

          <ListSubheader>Individual User</ListSubheader>
          {individualUserSegments.length > 0 &&
            individualUserSegments.map(
              (individualUser: segmentProps, index: number) => {
                return (
                  <MenuItem key={index} value={index + segments.length}>
                    {individualUser.name}
                  </MenuItem>
                );
              },
            )}
        </Select>
      </FormControl>
    </div>
  );
}
