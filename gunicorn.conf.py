
import os

from prometheus_client import multiprocess

bind = "0.0.0.0:8080"
workers = 2

def child_exit(server, worker):
    multiprocess.mark_process_dead(worker.pid)
