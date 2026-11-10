from dataclasses import dataclass


@dataclass
class Song:
    title: str
    seconds: int


def length_of(song):
    return song.seconds


class Playlist:
    def __init__(self, name):
        self.name = name
        self.songs = []

    def add(self, song):
        self.songs.append(song)

    def __len__(self):
        return len(self.songs)

    def __str__(self):
        return f"{self.name}: {len(self.songs)} songs"

    def __contains__(self, title):
        return title in [s.title for s in self.songs]

    def sorted_by_length(self):
        return sorted(self.songs, key=length_of, reverse=True)
