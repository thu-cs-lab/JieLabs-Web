import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { get } from '../util';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';

export default React.memo(() => {
  const [users, setUsers] = useState([]);
  const [boards, setBoards] = useState([]);
  const [jobs, setJobs] = useState([]);
  const history = useHistory();
  const dispatch = useDispatch();

  const doRefresh = useCallback(async () => {
    let result = await get('/api/user/list?offset=0&limit=-1');
    setUsers(result.users);
    result = await get('/api/board/list');
    setBoards(result);
    result = await get('/api/task/list?offset=0&limit=-1');
    setJobs(result.jobs);
  }, []);

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
      </TableContainer>
    </Container>
  </main>;
});
