import React, { useState, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { get } from '../util';


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
  </main>;
});
