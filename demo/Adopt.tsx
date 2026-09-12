import { useMemo } from 'react'
import { createTheme, ThemeProvider, type Theme, type ThemeOptions } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import ScopedCssBaseline from '@mui/material/ScopedCssBaseline'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import bridge from '../bridges/vela.mui-theme.json'

type Mode = 'light' | 'dark'
type Visit = { id: string; department: string; waited: string; status: 'Checked in' | 'Waiting' | 'In consult' }

// Synthetic rows. A health product's real screen would carry patient data; a demo never does.
const QUEUE: Visit[] = [
  { id: 'PT-1042', department: 'General', waited: '4 min', status: 'In consult' },
  { id: 'PT-1057', department: 'Paediatrics', waited: '11 min', status: 'Waiting' },
  { id: 'PT-1061', department: 'Physiotherapy', waited: '2 min', status: 'Checked in' },
  { id: 'PT-1063', department: 'General', waited: '19 min', status: 'Waiting' },
]
const CHIP: Record<Visit['status'], 'success' | 'warning' | 'info'> = { 'Checked in': 'success', Waiting: 'warning', 'In consult': 'info' }

// The acquired product as it ships: a front-desk screen built on stock Material UI.
// Nothing in here knows about Vela. That is the point of the demo.
function FrontDesk() {
  return (
    <Box>
      <AppBar position="static" elevation={0}>
        <Toolbar variant="dense">
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>ClinicDesk · Front desk</Typography>
          <Button color="inherit" size="small">Sign out</Button>
        </Toolbar>
      </AppBar>
      <Stack spacing={2} sx={{ p: 2 }}>
        <Alert severity="warning">3 lab results are waiting for review.</Alert>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>New appointment</Typography>
          <Stack spacing={2}>
            <TextField label="Patient ID" size="small" defaultValue="PT-1070" />
            <TextField label="Department" size="small" select defaultValue="General">
              {['General', 'Paediatrics', 'Physiotherapy'].map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </TextField>
            <FormControlLabel control={<Switch defaultChecked />} label="Send SMS reminder" />
            <Stack direction="row" spacing={1}>
              <Button variant="contained">Save</Button>
              <Button variant="outlined">Cancel</Button>
              <Button color="error">Cancel visit</Button>
            </Stack>
          </Stack>
        </Paper>
        <Paper variant="outlined">
          <Table size="small" aria-label="Today's queue">
            <TableHead>
              <TableRow>
                <TableCell>Patient</TableCell><TableCell>Department</TableCell><TableCell>Waited</TableCell><TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {QUEUE.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{v.id}</TableCell>
                  <TableCell>{v.department}</TableCell>
                  <TableCell>{v.waited}</TableCell>
                  <TableCell><Chip size="small" label={v.status} color={CHIP[v.status]} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Stack>
    </Box>
  )
}

function Column({ caption, theme }: { caption: string; theme: Theme }) {
  return (
    <div className="adopt-col">
      <p className="vela-meta adopt-caption">{caption}</p>
      <div className="adopt-frame">
        <ThemeProvider theme={theme}>
          <ScopedCssBaseline sx={{ bgcolor: 'background.default', color: 'text.primary', minHeight: 560 }}>
            <FrontDesk />
          </ScopedCssBaseline>
        </ThemeProvider>
      </div>
    </div>
  )
}

export function Adopt({ mode }: { mode: 'system' | Mode }) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const resolved: Mode = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode
  const stock = useMemo(() => createTheme({ palette: { mode: resolved } }), [resolved])
  const vela = useMemo(() => createTheme(bridge[resolved] as ThemeOptions), [resolved])
  return (
    <section className="demo-section">
      <h2 className="vela-h3">Adopt without rewrite</h2>
      <p className="vela-meta demo-note">
        An acquired product built on Material UI, rendered twice from identical component code. The right-hand
        copy receives one extra thing: a theme object generated from tokens/vela.tokens.json.
      </p>
      <div className="adopt-grid">
        <Column caption="Before — as it ships today. Stock Material UI, default theme." theme={stock} />
        <Column caption="After — identical code, createTheme(vela). No component touched." theme={vela} />
      </div>
      <p className="vela-meta adopt-limit">
        What the theme fixes: colour, type, radius, surfaces, alerts, both modes — {Object.keys(bridge.$sources).length} colour
        roles and {Object.keys(bridge.$typeSources).length} type variants, each traced to a token and tested against the
        source (@omkarux/vela/mui-theme.json). What it cannot fix: Material
        has one colour vocabulary, so the status chips above wear severity colours. Vela keeps Severity and Status
        apart, and that is component work — which is why shared components are step two, not step one.
      </p>
    </section>
  )
}
