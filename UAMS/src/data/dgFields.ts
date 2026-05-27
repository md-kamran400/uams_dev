export type FieldType = 'time' | 'number' | 'text' | 'dropdown';

export interface DGField {
  id: number;
  fieldName: string;
  type: FieldType;
  unit: string;
  required: boolean;
  computed: boolean;
  formulaOrOptions: string;
}

export const DG_FIELDS: DGField[] = [
  { id:  1, fieldName: 'Start Time',       type: 'time',     unit: '—',   required: true,  computed: false, formulaOrOptions: '—' },
  { id:  2, fieldName: 'Stop Time',        type: 'time',     unit: '—',   required: true,  computed: false, formulaOrOptions: '—' },
  { id:  3, fieldName: 'Running Time',     type: 'number',   unit: 'hrs', required: false, computed: true,  formulaOrOptions: 'Stop Time - Start Time' },
  { id:  4, fieldName: 'HSD Start',        type: 'number',   unit: 'L',   required: true,  computed: false, formulaOrOptions: '—' },
  { id:  5, fieldName: 'HSD Stop',         type: 'number',   unit: 'L',   required: true,  computed: false, formulaOrOptions: '—' },
  { id:  6, fieldName: 'HSD Consumed',     type: 'number',   unit: 'L',   required: false, computed: true,  formulaOrOptions: 'HSD Start - HSD Stop' },
  { id:  7, fieldName: 'Start KWH',        type: 'number',   unit: 'kWh', required: true,  computed: false, formulaOrOptions: '—' },
  { id:  8, fieldName: 'Stop KWH',         type: 'number',   unit: 'kWh', required: true,  computed: false, formulaOrOptions: '—' },
  { id:  9, fieldName: 'Total KWH',        type: 'number',   unit: 'kWh', required: false, computed: true,  formulaOrOptions: 'Stop KWH - Start KWH' },
  { id: 10, fieldName: 'Current',          type: 'number',   unit: 'A',   required: false, computed: false, formulaOrOptions: '—' },
  { id: 11, fieldName: 'Voltage',          type: 'number',   unit: 'V',   required: false, computed: false, formulaOrOptions: '—' },
  { id: 12, fieldName: 'Frequency',        type: 'number',   unit: 'Hz',  required: false, computed: false, formulaOrOptions: '—' },
  { id: 13, fieldName: 'Oil Pressure',     type: 'number',   unit: 'Bar', required: false, computed: false, formulaOrOptions: '—' },
  { id: 14, fieldName: 'Oil Temperature',  type: 'number',   unit: '°C',  required: false, computed: false, formulaOrOptions: '—' },
  { id: 15, fieldName: 'Coolant Temp',     type: 'number',   unit: '°C',  required: false, computed: false, formulaOrOptions: '—' },
  { id: 16, fieldName: 'Hour Meter Start', type: 'number',   unit: 'hrs', required: false, computed: false, formulaOrOptions: '—' },
  { id: 17, fieldName: 'Weather',          type: 'dropdown', unit: '—',   required: false, computed: false, formulaOrOptions: 'Clear, Cloudy, Rainy, Stormy' },
  { id: 18, fieldName: 'Remarks',          type: 'text',     unit: '—',   required: false, computed: false, formulaOrOptions: '—' },
];
