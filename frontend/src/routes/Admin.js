import React, { useState, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { get } from '../util';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableFooter from '@material-ui/core/TableFooter';
import TablePagination from '@material-ui/core/TablePagination';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';

export default React.memo(() => {
  const [users, setUsers] = useState([]);
  const [boards, setBoards] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);

  const doRefresh = useCallback(async () => {
    let result = await get('/api/user/list?offset=0&limit=-1');
    setUsers(result.users);
    result = await get('/api/board/list');
    setBoards(result);
    let offset = page * rowsPerPage;
    if (rowsPerPage < 0) {
      // all
      offset = 0;
    }
    result = await get(`/api/task/list?offset=${offset}&limit=${rowsPerPage}`);
    setJobs(result.jobs);
  }, [page, rowsPerPage]);

  const handleChangePage = useCallback((e, v) => {
    setPage(v);
    doRefresh();
  }, [doRefresh]);

  const handleChangeRowsPerPage = useCallback(e => {
    setRowsPerPage(parseInt(e.target.value, 10));
    doRefresh();
  }, [doRefresh]);

  useEffect(() => {
    doRefresh();
  }, [doRefresh]);

  return <main>
    <Container>
      <Button variant="contained" onClick={doRefresh}>
        Refresh
    </Button>
      <TableContainer component={Paper} style={{
        minHeight: 300,
      }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User Name</TableCell>
              <TableCell>Real Name</TableCell>
              <TableCell>Class</TableCell>
              <TableCell>Student Id</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.user_name}>
                <TableCell component="th" scope="row">
                  {user.user_name}
                </TableCell>
                <TableCell>{user.real_name}</TableCell>
                <TableCell>{user.class}</TableCell>
                <TableCell>{user.student_id}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {boards.map(board =>
        <div>
          <p>{`Remove: ${board.remote}`}</p>
          <p>{`Software Version: ${board.software_version}`}</p>
          <p>{`Hardware Version: ${board.hardware_version}`}</p>
        </div>
      )}
      <TableContainer component={Paper} style={{
        minHeight: 300,
      }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Job Id</TableCell>
              <TableCell>Submitter</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobs.map(job => (
              <TableRow key={job.id}>
                <TableCell component="th" scope="row">
                  {job.id}
                </TableCell>
                <TableCell>{job.submitter}</TableCell>
                <TableCell>{job.type_}</TableCell>
                <TableCell>{job.status}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TableFooter>
          <TableRow>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
              colSpan={3}
              count={jobs.length}
              rowsPerPage={rowsPerPage}
              page={page}
              SelectProps={{
                inputProps: { 'aria-label': 'rows per page' },
                native: true,
              }}
              onChangePage={handleChangePage}
              onChangeRowsPerPage={handleChangeRowsPerPage}
            />
          </TableRow>
        </TableFooter>
      </TableContainer>
    </Container>
  </main>;
});
