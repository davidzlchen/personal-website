"""Exercise client upgrades and failure privacy without making game requests."""
import io
import json
from pathlib import Path
from types import SimpleNamespace
import tempfile
import unittest
import subprocess
from unittest.mock import patch

from sync_sleep_collection import current_client_version, fetch_private_source


class ClientRefreshTest(unittest.TestCase):
    def app(self):
        return dict(trackId=1579464667, bundleId='jp.pokemon.pokemonsleep', version='3.9.1')

    def lookup(self, results):
        return patch('sync_sleep_collection.urlopen', return_value=io.StringIO(json.dumps({'results': results})))

    def test_tracks_official_version_and_rejects_wrong_app_or_invalid_version(self):
        for version in ['3.9.1', '3.10.0']:
            app = self.app()
            app['version'] = version
            with self.lookup([app]):
                self.assertEqual(current_client_version(), version)
        for changes in [{'trackId': 1}, {'bundleId': 'other.app'}, {'version': '3.9.1\nsecret'}]:
            app = self.app()
            app.update(changes)
            with self.lookup([app]), self.assertRaisesRegex(ValueError, 'No game request was sent'):
                current_client_version()

    def test_lookup_failure_never_runs_private_helper(self):
        with tempfile.TemporaryDirectory() as directory:
            workspace = self.workspace(directory)
            with (patch('sync_sleep_collection.urlopen', side_effect=OSError('private-value')),
                  patch('sync_sleep_collection.subprocess.run') as run):
                with self.assertRaises(ValueError) as caught:
                    fetch_private_source(workspace)
                self.assertNotIn('private-value', str(caught.exception))
                run.assert_not_called()

    def workspace(self, directory):
        workspace = Path(directory)
        (workspace / '.research/proxy-venv/bin').mkdir(parents=True)
        (workspace / '.research/proxy-venv/bin/python').touch()
        (workspace / '.research/refresh_and_fetch.py').touch()
        return workspace

    def test_passes_current_version_and_accepts_only_verified_private_capture(self):
        with tempfile.TemporaryDirectory() as directory:
            workspace = self.workspace(directory)
            capture = workspace / '.research/capture'
            capture.mkdir()
            source = capture / 'roster-decoded.json'
            source.write_text('{}')
            summary = capture / 'safe-summary.json'
            result = SimpleNamespace(returncode=0, stdout='Private output: .research/capture\n')
            with self.lookup([self.app()]), patch('sync_sleep_collection.subprocess.run', return_value=result) as run:
                summary.write_text('{"full_roster_verified":true}')
                self.assertEqual(fetch_private_source(workspace), (source.resolve(), '3.9.1'))
                self.assertEqual(run.call_args.kwargs['env']['POKEMON_SLEEP_CLIENT_VERSION'], '3.9.1')
            for state in [False, 'true', None]:
                summary.write_text(json.dumps({'full_roster_verified': state}))
                with self.lookup([self.app()]), patch('sync_sleep_collection.subprocess.run', return_value=result), self.assertRaisesRegex(ValueError, 'complete roster'):
                    fetch_private_source(workspace)

    def test_failure_reports_stage_and_code_without_private_output(self):
        with tempfile.TemporaryDirectory() as directory:
            workspace = self.workspace(directory)
            result = SimpleNamespace(returncode=1, stdout='secret-token\nget-token HTTP 200 server code 9901 payload present False\n')
            with self.lookup([self.app()]), patch('sync_sleep_collection.subprocess.run', return_value=result):
                with self.assertRaises(ValueError) as caught:
                    fetch_private_source(workspace)
                self.assertIn('get-token (HTTP 200, server code 9901, client 3.9.1)', str(caught.exception))
                self.assertNotIn('secret-token', str(caught.exception))

    def test_timeout_and_private_path_escape_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            workspace = self.workspace(directory)
            timeout = subprocess.TimeoutExpired('helper', 120, output='secret-token')
            with self.lookup([self.app()]), patch('sync_sleep_collection.subprocess.run', side_effect=timeout):
                with self.assertRaises(ValueError) as caught:
                    fetch_private_source(workspace)
                self.assertNotIn('secret-token', str(caught.exception))
            result = SimpleNamespace(returncode=0, stdout='Private output: ../outside\n')
            with self.lookup([self.app()]), patch('sync_sleep_collection.subprocess.run', return_value=result), self.assertRaisesRegex(ValueError, 'invalid private capture path'):
                fetch_private_source(workspace)


if __name__ == '__main__':
    unittest.main()
